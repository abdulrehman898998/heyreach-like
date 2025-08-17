import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export default function Dashboard() {
  const stats = [
    {
      title: 'Instagram Accounts',
      value: '0',
      description: 'Connected accounts',
      icon: '👤',
      trend: '0%',
      link: '/accounts',
      color: 'bg-blue-50 border-blue-200'
    },
    {
      title: 'Total Leads',
      value: '0',
      description: 'Imported leads',
      icon: '📋',
      trend: '0%',
      link: '/leads',
      color: 'bg-green-50 border-green-200'
    },
    {
      title: 'Active Campaigns',
      value: '0',
      description: 'Running campaigns',
      icon: '🚀',
      trend: '0%',
      link: '/campaigns',
      color: 'bg-purple-50 border-purple-200'
    },
    {
      title: 'Messages Sent',
      value: '0',
      description: 'Today',
      icon: '💬',
      trend: '0%',
      link: '/campaigns',
      color: 'bg-orange-50 border-orange-200'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Link key={stat.title} to={stat.link} className="block group">
            <Card className={`hover:shadow-sm transition-shadow border ${stat.color} h-full`}>
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg">{stat.icon}</span>
                  <span className="text-xs font-medium text-gray-500">
                    {stat.trend}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-xl font-semibold text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-sm font-medium text-gray-700 mb-1">{stat.title}</p>
                  <p className="text-xs text-gray-500">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription className="text-sm">Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/accounts" className="block">
              <Button variant="outline" className="w-full justify-start h-9 text-sm">
                <span className="mr-2">➕</span>
                <div className="text-left">
                  <div className="font-medium text-gray-700">Add Instagram Account</div>
                  <div className="text-xs text-gray-500">Connect a new account</div>
                </div>
              </Button>
            </Link>
            <Link to="/leads" className="block">
              <Button variant="outline" className="w-full justify-start h-9 text-sm">
                <span className="mr-2">📥</span>
                <div className="text-left">
                  <div className="font-medium text-gray-700">Import Leads</div>
                  <div className="text-xs text-gray-500">Upload CSV file</div>
                </div>
              </Button>
            </Link>
            <Link to="/campaigns" className="block">
              <Button variant="outline" className="w-full justify-start h-9 text-sm">
                <span className="mr-2">🎯</span>
                <div className="text-left">
                  <div className="font-medium text-gray-700">Create Campaign</div>
                  <div className="text-xs text-gray-500">Start outreach</div>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription className="text-sm">Latest system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2 text-2xl">📊</div>
              <p className="text-sm text-gray-500">No recent activity</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}