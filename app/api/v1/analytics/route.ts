import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/services/api-keys";

// GET /api/v1/analytics - Get analytics data
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const auth = await authenticateApiKey(apiKey, "analytics:read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId") || auth.branchId;
  const metric = searchParams.get("metric") || "summary";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
  const end = endDate ? new Date(endDate) : new Date();

  const branchFilter = branchId ? { branchId } : {};

  try {
    switch (metric) {
      case "summary": {
        const [sales, waste, inventory, staff] = await Promise.all([
          db.sale.findMany({
            where: {
              deletedAt: null,
              ...branchFilter,
              saleDate: { gte: start, lte: end },
            },
            include: { items: true },
          }),
          db.wasteLog.findMany({
            where: {
              ...branchFilter,
              wasteDate: { gte: start, lte: end },
            },
          }),
          db.inventoryItem.aggregate({
            where: {
              deletedAt: null,
              isActive: true,
              ...branchFilter,
            },
            _count: true,
          }),
          db.staff.count({
            where: {
              deletedAt: null,
              isActive: true,
              ...branchFilter,
            },
          }),
        ]);

        const totalRevenue = sales.reduce((s, x) => s + Number(x.total), 0);
        const totalCogs = sales.reduce((sum, sale) => {
          return sum + sale.items.reduce((s, it) => s + Number(it.unitCost) * Number(it.quantity), 0);
        }, 0);
        const totalWaste = waste.reduce((s, w) => s + Number(w.totalCost), 0);
        const grossProfit = totalRevenue - totalCogs;

        return NextResponse.json({
          data: {
            period: { startDate: start.toISOString(), endDate: end.toISOString() },
            revenue: {
              total: Math.round(totalRevenue * 100) / 100,
              transactions: sales.length,
              averageTicket: Math.round((totalRevenue / (sales.length || 1)) * 100) / 100,
            },
            profitability: {
              grossProfit: Math.round(grossProfit * 100) / 100,
              grossMargin: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0,
              cogs: Math.round(totalCogs * 100) / 100,
              cogsPercentage: totalRevenue > 0 ? Math.round((totalCogs / totalRevenue) * 1000) / 10 : 0,
            },
            waste: {
              total: Math.round(totalWaste * 100) / 100,
              incidents: waste.length,
              wastePercentage: totalRevenue > 0 ? Math.round((totalWaste / totalRevenue) * 1000) / 10 : 0,
            },
            operations: {
              inventoryItems: inventory._count,
              staffCount: staff,
            },
          },
        });
      }

      case "sales-trend": {
        const sales = await db.sale.findMany({
          where: {
            deletedAt: null,
            ...branchFilter,
            saleDate: { gte: start, lte: end },
          },
          select: {
            saleDate: true,
            total: true,
          },
          orderBy: { saleDate: "asc" },
        });

        // Aggregate by day
        const dailyData: Record<string, { revenue: number; count: number }> = {};
        sales.forEach((sale) => {
          const dateKey = sale.saleDate.toISOString().split("T")[0];
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { revenue: 0, count: 0 };
          }
          dailyData[dateKey].revenue += Number(sale.total);
          dailyData[dateKey].count += 1;
        });

        return NextResponse.json({
          data: {
            period: { startDate: start.toISOString(), endDate: end.toISOString() },
            trend: Object.entries(dailyData).map(([date, data]) => ({
              date,
              revenue: Math.round(data.revenue * 100) / 100,
              transactions: data.count,
            })),
          },
        });
      }

      case "top-products": {
        const sales = await db.sale.findMany({
          where: {
            deletedAt: null,
            ...branchFilter,
            saleDate: { gte: start, lte: end },
          },
          include: {
            items: {
              include: {
                menuItem: {
                  select: { id: true, name: true, category: true },
                },
              },
            },
          },
        });

        // Aggregate by product
        const productData: Record<string, { name: string; category: string; quantity: number; revenue: number }> = {};
        sales.forEach((sale) => {
          sale.items.forEach((item) => {
            const id = item.menuItemId;
            if (!productData[id]) {
              productData[id] = {
                name: item.menuItem?.name || "Unknown",
                category: item.menuItem?.category || "Unknown",
                quantity: 0,
                revenue: 0,
              };
            }
            productData[id].quantity += Number(item.quantity);
            productData[id].revenue += Number(item.total);
          });
        });

        const sortedProducts = Object.entries(productData)
          .sort(([, a], [, b]) => b.revenue - a.revenue)
          .slice(0, 20)
          .map(([id, data]) => ({
            menuItemId: id,
            ...data,
            revenue: Math.round(data.revenue * 100) / 100,
          }));

        return NextResponse.json({
          data: {
            period: { startDate: start.toISOString(), endDate: end.toISOString() },
            products: sortedProducts,
          },
        });
      }

      case "hourly-distribution": {
        const sales = await db.sale.findMany({
          where: {
            deletedAt: null,
            ...branchFilter,
            saleDate: { gte: start, lte: end },
          },
          select: {
            saleDate: true,
            total: true,
          },
        });

        // Aggregate by hour
        const hourlyData: Record<number, { revenue: number; count: number }> = {};
        for (let i = 0; i < 24; i++) {
          hourlyData[i] = { revenue: 0, count: 0 };
        }

        sales.forEach((sale) => {
          const hour = sale.saleDate.getHours();
          hourlyData[hour].revenue += Number(sale.total);
          hourlyData[hour].count += 1;
        });

        return NextResponse.json({
          data: {
            period: { startDate: start.toISOString(), endDate: end.toISOString() },
            hourly: Object.entries(hourlyData).map(([hour, data]) => ({
              hour: parseInt(hour),
              revenue: Math.round(data.revenue * 100) / 100,
              transactions: data.count,
            })),
          },
        });
      }

      case "branch-comparison": {
        if (branchId) {
          return NextResponse.json(
            { error: "Branch comparison requires access to all branches" },
            { status: 400 }
          );
        }

        const branches = await db.branch.findMany({
          where: { isActive: true, deletedAt: null },
        });

        const branchData = await Promise.all(
          branches.map(async (branch) => {
            const sales = await db.sale.findMany({
              where: {
                deletedAt: null,
                branchId: branch.id,
                saleDate: { gte: start, lte: end },
              },
            });

            const revenue = sales.reduce((s, x) => s + Number(x.total), 0);

            return {
              branchId: branch.id,
              branchName: branch.name,
              branchCode: branch.code,
              revenue: Math.round(revenue * 100) / 100,
              transactions: sales.length,
              averageTicket: Math.round((revenue / (sales.length || 1)) * 100) / 100,
            };
          })
        );

        branchData.sort((a, b) => b.revenue - a.revenue);

        return NextResponse.json({
          data: {
            period: { startDate: start.toISOString(), endDate: end.toISOString() },
            branches: branchData,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown metric: ${metric}. Available: summary, sales-trend, top-products, hourly-distribution, branch-comparison` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[GET /api/v1/analytics] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
