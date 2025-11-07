import { Sidebar } from '../../components/Layout/Sidebar';
import { MetricCard } from './metric-card';
import { AppointmentItem } from './appointment-item';
import { StylistItem } from './stylist-item';
import { PerformanceChart } from './performance-chart';
import { ChatWidget } from './chat-widget';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <h1 className="mb-8 text-3xl font-bold">Welcome to the dashboard!</h1>

          {/* Metrics */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard title="Bookings" subtitle="today" value="12" />
            <MetricCard title="Cancellations" subtitle="today" value="3" />
            <MetricCard title="Avg. Ticket" subtitle="" value="$98" />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Left Column */}
            <div className="flex flex-col gap-4">
              {/* Today's Appointments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Today&apos;s appointments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <AppointmentItem
                    name="Maria Torres"
                    service="Hair Styling"
                    time="9:30 AM"
                    avatarUrl="/diverse-woman-portrait.png"
                  />
                  <AppointmentItem name="John Doe" service="Hair Coloring" time="11:00 AM" avatarUrl="/man.jpg" />
                  <AppointmentItem name="Henry Wilson" service="Haircut" time="1:00 PM" avatarUrl="/woman-2.jpg" />
                  <div className="pt-2">
                    <Link to="#" className="text-sm font-medium text-[oklch(0.55_0.25_280)] hover:underline">
                      See agenda
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Chart */}
              <PerformanceChart />
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-4">
              {/* Top Stylists */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Top stylists</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <StylistItem name="Sara Smith" revenue="$4,200" avatarUrl="/stylist-1.jpg" />
                  <StylistItem name="Anita Johnson" revenue="$3,575" avatarUrl="/stylist-2.jpg" />
                  <StylistItem name="Jane Doe" revenue="$3,200" avatarUrl="/stylist-3.jpg" />
                </CardContent>
              </Card>

              {/* Chat Widget */}
              <ChatWidget />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}