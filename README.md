# Dinelytix

**Smart Intelligence for Modern Restaurants**

Dinelytix is a production-grade Executive Restaurant Analytics & Operations Platform providing CEO-level visibility into multi-branch restaurant operations.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

## Features

### Core Modules

- **Executive Dashboard** - Real-time KPIs, revenue trends, and performance metrics
- **Branch Performance** - Compare branches, identify underperformers, track targets
- **Inventory Management** - Track stock levels, manage transfers, reduce waste
- **Sales Analytics** - Deep dive into sales by channel, daypart, and menu performance
- **Staff Management** - Monitor staffing levels, schedules, and labor efficiency
- **Smart Alerts** - Automated alerts for sales drops, low stock, waste spikes, and more
- **Reports** - Generate and export executive summaries and detailed reports

### Key Features

- Role-Based Access Control (CEO, Senior Management, Branch Manager, Finance/Ops)
- Real-time analytics with beautiful charts (Recharts)
- Glassmorphism UI with blue accent theme
- Dark/Light mode support
- Mobile responsive design
- Audit trail for all data changes
- Row-level branch security

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: BetterAuth with RBAC
- **Charts**: Recharts
- **State Management**: React Server Components + Server Actions

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dinelytix
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your database credentials:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/dinelytix"
   BETTER_AUTH_SECRET="your-super-secret-key-min-32-characters"
   BETTER_AUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Generate Prisma client and push schema**
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Seed the database**
   ```bash
   npm run db:seed
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Test Accounts

After seeding, use these accounts to log in:

| Role | Email | Password |
|------|-------|----------|
| CEO | alex@dinelytix.com | password123 |
| Senior Management | sarah@dinelytix.com | password123 |
| Branch Manager | mike@dinelytix.com | password123 |
| Finance/Ops | emily@dinelytix.com | password123 |

## Project Structure

```
dinelytix/
├── app/
│   ├── (auth)/              # Auth pages (login, etc.)
│   ├── (dashboard)/         # Dashboard pages
│   │   └── dashboard/
│   │       ├── page.tsx     # Executive Dashboard
│   │       ├── branches/    # Branch Performance
│   │       ├── sales/       # Sales Analytics
│   │       ├── inventory/   # Inventory Management
│   │       ├── staff/       # Staff Management
│   │       ├── alerts/      # Smart Alerts
│   │       ├── reports/     # Reports
│   │       └── settings/    # Settings
│   ├── api/                 # API routes
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── dashboard/           # Dashboard components
│   ├── branches/            # Branch components
│   ├── inventory/           # Inventory components
│   ├── sales/               # Sales components
│   ├── staff/               # Staff components
│   ├── alerts/              # Alert components
│   ├── reports/             # Report components
│   └── auth/                # Auth components
├── lib/
│   ├── auth.ts              # BetterAuth configuration
│   ├── auth-client.ts       # Auth client
│   ├── db.ts                # Prisma client
│   ├── types.ts             # TypeScript types
│   ├── utils.ts             # Utility functions
│   └── mock-data.ts         # Mock data for development
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed script
└── middleware.ts            # Auth middleware
```

## Database Models

- **User** - System users with roles
- **Branch** - Restaurant branches
- **Staff** - Branch employees
- **MenuItem** - Menu items
- **Sale** - Sales transactions
- **Transaction** - Payment transactions
- **InventoryItem** - Stock items
- **InboundStock** - Stock deliveries
- **OutboundStock** - Stock usage
- **WasteLog** - Waste tracking
- **TransferLog** - Inter-branch transfers
- **Target** - Branch targets
- **Alert** - System alerts
- **AuditLog** - Audit trail

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Reset and reseed database
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker

```dockerfile
# Dockerfile example coming soon
```

## Future Roadmap

- [ ] POS integrations
- [ ] AI forecasting
- [ ] Supplier contract tracking
- [ ] Push notifications
- [ ] Predictive reorder engine
- [ ] Mobile app

## License

Private - All rights reserved.

## Support

For support, email support@dinelytix.com
