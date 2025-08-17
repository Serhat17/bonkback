import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type AvailableCashback } from '@/lib/data-access/available-cashback';
// Helper functions for formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

interface TransactionDetailsProps {
  transaction: AvailableCashback;
}

export function TransactionDetails({ transaction }: TransactionDetailsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'approved': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Transaction Details</CardTitle>
        <CardDescription>
          Cashback release timeline and amounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <div className="mt-1">
              <Badge className={getStatusColor(transaction.status)}>
                {transaction.status}
              </Badge>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Purchase Date</label>
            <p className="mt-1">{formatTimestamp(transaction.purchase_date)}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Purchase Amount</label>
            <p className="mt-1 font-mono">{formatCurrency(transaction.purchase_amount)}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Total Cashback</label>
            <p className="mt-1 font-mono">{formatCurrency(transaction.total_cashback)}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-3">Release Schedule</h4>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Return Window Ends</p>
                <p className="text-sm text-muted-foreground">
                  {formatTimestamp(transaction.return_window_ends_at)}
                </p>
              </div>
              <Badge variant="outline">
                {new Date(transaction.return_window_ends_at) <= new Date() ? 'Completed' : 'Pending'}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Immediate Release</p>
                <p className="text-sm text-muted-foreground">
                  Available from: {formatTimestamp(transaction.available_from_immediate)}
                </p>
                <p className="text-sm font-mono">
                  Amount: {formatCurrency(transaction.immediate_amount)}
                </p>
              </div>
              <Badge variant="outline">
                {new Date(transaction.available_from_immediate) <= new Date() ? 'Available' : 'Locked'}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Deferred Release</p>
                <p className="text-sm text-muted-foreground">
                  Available from: {formatTimestamp(transaction.available_from_deferred)}
                </p>
                <p className="text-sm font-mono">
                  Amount: {formatCurrency(transaction.deferred_amount)}
                </p>
              </div>
              <Badge variant="outline">
                {new Date(transaction.available_from_deferred) <= new Date() ? 'Available' : 'Locked'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Currently Available</span>
            <span className="text-lg font-mono text-primary">
              {formatCurrency(transaction.available_amount)}
            </span>
          </div>
          
          {transaction.is_returned && (
            <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Transaction flagged as returned/refunded - cashback blocked
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}