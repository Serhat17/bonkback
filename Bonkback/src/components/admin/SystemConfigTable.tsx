import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, Search, Plus } from 'lucide-react';
import { SystemConfigModal } from './SystemConfigModal';

interface SystemConfig {
  key: string;
  value: any;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function SystemConfigTable() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .order('key', { ascending: true });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      console.error('Error fetching system config:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleDeleteConfig = async (configKey: string) => {
    try {
      const { error } = await supabase
        .from('system_config')
        .delete()
        .eq('key', configKey);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Configuration deleted successfully",
      });
      
      fetchConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      toast({
        title: "Error",
        description: "Failed to delete configuration",
        variant: "destructive",
      });
    }
  };

  const filteredConfigs = configs.filter(config =>
    config.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (config.description && config.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="text-center">Loading system configuration...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Configuration</CardTitle>
              <p className="text-muted-foreground">Manage system-wide configuration values</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Config
            </Button>
          </div>
          
          <div className="flex items-center space-x-2 pt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search configuration..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfigs.map((config) => (
                  <TableRow key={config.key}>
                    <TableCell className="font-medium font-mono">
                      {config.key}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {typeof config.value === 'object' 
                          ? JSON.stringify(config.value) 
                          : String(config.value)
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {config.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(config.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingConfig(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{config.key}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteConfig(config.key)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredConfigs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No configuration found matching your search." : "No system configuration available."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <SystemConfigModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onConfigAdded={fetchConfigs}
      />

      <SystemConfigModal
        open={!!editingConfig}
        onOpenChange={(open) => !open && setEditingConfig(null)}
        onConfigAdded={fetchConfigs}
        config={editingConfig}
      />
    </motion.div>
  );
}