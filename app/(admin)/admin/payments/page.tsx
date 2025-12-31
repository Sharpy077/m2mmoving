import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, CreditCard, RefreshCw, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

export default async function PaymentsPage() {
  const supabase = await createClient()

  const { data: payments } = await supabase
    .from("payments")
    .select("*, leads(contact_name, company_name, email)")
    .order("created_at", { ascending: false })
    .limit(100)

  const stats = {
    total: payments?.length || 0,
    succeeded: payments?.filter((p) => p.status === "succeeded").length || 0,
    pending: payments?.filter((p) => p.status === "pending" || p.status === "processing").length || 0,
    failed: payments?.filter((p) => p.status === "failed").length || 0,
    refunded: payments?.filter((p) => p.status === "refunded" || p.status === "partially_refunded").length || 0,
    totalRevenue: payments?.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    totalRefunds: payments?.reduce((sum, p) => sum + (p.refund_amount || 0), 0) || 0,
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "succeeded":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Succeeded</Badge>
      case "pending":
      case "processing":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Processing</Badge>
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>
      case "refunded":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Refunded</Badge>
      case "partially_refunded":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Partial Refund</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "succeeded":
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case "pending":
      case "processing":
        return <RefreshCw className="h-4 w-4 text-yellow-400 animate-spin" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-400" />
      case "refunded":
      case "partially_refunded":
        return <RefreshCw className="h-4 w-4 text-purple-400" />
      default:
        return <CreditCard className="h-4 w-4 text-white/40" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payments</h1>
        <p className="text-white/60">Track all payment transactions and refunds</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </div>
            <p className="text-2xl font-bold text-green-400 mt-1">${stats.totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <CheckCircle className="h-4 w-4" />
              Succeeded
            </div>
            <p className="text-2xl font-bold text-white mt-1">{stats.succeeded}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <RefreshCw className="h-4 w-4" />
              Processing
            </div>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <XCircle className="h-4 w-4" />
              Failed
            </div>
            <p className="text-2xl font-bold text-red-400 mt-1">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <RefreshCw className="h-4 w-4" />
              Refunds
            </div>
            <p className="text-2xl font-bold text-purple-400 mt-1">{stats.refunded}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <AlertTriangle className="h-4 w-4" />
              Refund Total
            </div>
            <p className="text-2xl font-bold text-orange-400 mt-1">${stats.totalRefunds.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-xs font-medium text-white/40 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-white/40 uppercase">Customer</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-white/40 uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-white/40 uppercase">Amount</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-white/40 uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-white/40 uppercase">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments?.map((payment) => (
                  <tr key={payment.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4 text-sm text-white/80">
                      {new Date(payment.created_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-white">{payment.customer_name || "N/A"}</div>
                      <div className="text-xs text-white/40">{payment.customer_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-white/60 border-white/20">
                        {payment.payment_type}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-white">${payment.amount?.toFixed(2)}</div>
                      {payment.refund_amount > 0 && (
                        <div className="text-xs text-orange-400">-${payment.refund_amount.toFixed(2)} refund</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(payment.status)}
                        {getStatusBadge(payment.status)}
                      </div>
                      {payment.failure_reason && (
                        <div className="text-xs text-red-400 mt-1">{payment.failure_reason}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {payment.receipt_url ? (
                        <a
                          href={payment.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:underline"
                        >
                          View Receipt
                        </a>
                      ) : (
                        <span className="text-sm text-white/30">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!payments || payments.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-white/40">
                      No payments recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
