import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download, Calendar, Euro, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface TaxReport {
  id: string;
  tax_year: number;
  country_code: string;
  report_type: 'annual' | 'quarterly' | 'monthly';
  total_cashback_eur: number;
  total_referral_eur: number;
  total_withdrawals_eur: number;
  taxable_amount_eur: number;
  status: 'pending' | 'generated' | 'downloaded' | 'submitted';
  generated_at?: string;
  created_at: string;
}

const TaxReportingDashboard = () => {
  const { toast } = useToast();
  const [reports, setReports] = useState<TaxReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState<'annual' | 'quarterly' | 'monthly'>('annual');
  const [isGenerating, setIsGenerating] = useState(false);

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tax_reports')
        .select('*')
        .order('tax_year', { ascending: false });

      if (error) throw error;
      setReports((data as TaxReport[]) || []);
    } catch (error: any) {
      console.error('Error loading tax reports:', error);
      toast({
        title: "Error",
        description: "Failed to load tax reports",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-tax-report', {
        body: {
          tax_year: selectedYear,
          country_code: 'DE',
          report_type: reportType,
          format: 'json'
        }
      });

      if (error) throw error;

      toast({
        title: "Report Generated",
        description: `Tax report for ${selectedYear} has been generated successfully.`
      });

      loadReports();
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate tax report",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = async (report: TaxReport, format: 'json' | 'csv' = 'csv') => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-tax-report', {
        body: {
          tax_year: report.tax_year,
          country_code: report.country_code,
          report_type: report.report_type,
          format
        }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([format === 'json' ? JSON.stringify(data, null, 2) : data], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bonkback-tax-report-${report.tax_year}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update report status
      await supabase
        .from('tax_reports')
        .update({ status: 'downloaded' })
        .eq('id', report.id);

      loadReports();

      toast({
        title: "Download Started",
        description: `Tax report for ${report.tax_year} is being downloaded.`
      });
    } catch (error: any) {
      console.error('Error downloading report:', error);
      toast({
        title: "Error",
        description: "Failed to download tax report",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'generated': return 'bg-blue-500';
      case 'downloaded': return 'bg-green-500';
      case 'submitted': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold">Tax Reporting (Germany)</h2>
        <p className="text-muted-foreground">Generate tax reports for your crypto earnings</p>
      </div>

      {/* Important Notice */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-800">Important Tax Information</h3>
              <p className="text-sm text-orange-700 mt-1">
                This report is for informational purposes only. German tax law requires crypto earnings 
                above €801 per year to be reported. Please consult a tax professional for official advice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate New Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Tax Report
          </CardTitle>
          <CardDescription>Create a new tax report for a specific year</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Tax Year</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={generateReport} disabled={isGenerating} className="w-full">
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Reports */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Tax Reports</h3>
        
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">Loading reports...</div>
            </CardContent>
          </Card>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No tax reports generated yet</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{report.tax_year} Tax Report</h4>
                        <Badge className={getStatusColor(report.status)}>
                          {report.status}
                        </Badge>
                        <Badge variant="outline">{report.report_type}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Cashback Earned</p>
                          <p className="font-medium text-green-600">
                            {formatCurrency(report.total_cashback_eur)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Referral Earnings</p>
                          <p className="font-medium text-blue-600">
                            {formatCurrency(report.total_referral_eur)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Withdrawals</p>
                          <p className="font-medium text-gray-600">
                            {formatCurrency(report.total_withdrawals_eur)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Taxable Amount</p>
                          <p className="font-medium text-orange-600">
                            {formatCurrency(report.taxable_amount_eur)}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {report.generated_at 
                          ? `Generated on ${new Date(report.generated_at).toLocaleDateString()}`
                          : `Created on ${new Date(report.created_at).toLocaleDateString()}`
                        }
                      </p>
                    </div>
                    
                    {report.status === 'generated' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReport(report, 'csv')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          CSV
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReport(report, 'json')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          JSON
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tax Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            German Tax Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold">Tax-Free Allowance (2024)</h4>
            <p className="text-muted-foreground">€801 per year for capital gains from crypto activities</p>
          </div>
          <div>
            <h4 className="font-semibold">Reporting Requirements</h4>
            <p className="text-muted-foreground">
              Crypto earnings above the allowance must be reported in your annual tax return. 
              Cashback and referral bonuses are considered taxable income.
            </p>
          </div>
          <div>
            <h4 className="font-semibold">Record Keeping</h4>
            <p className="text-muted-foreground">
              Keep detailed records of all transactions, including dates, amounts, and exchange rates.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TaxReportingDashboard;
