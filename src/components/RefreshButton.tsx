import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { store } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  onRefresh?: () => Promise<void> | void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function RefreshButton({ onRefresh, className, size = 'sm' }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Always refresh the main store data
      await store.refreshData();
      
      // Call any page-specific refresh function
      if (onRefresh) {
        await onRefresh();
      }
      
      toast({
        title: 'Refreshed',
        description: 'Data has been updated',
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: 'Refresh Failed',
        description: error instanceof Error ? error.message : 'Failed to refresh data',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10',
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={cn(
        'shrink-0',
        sizeClasses[size],
        className
      )}
      title="Refresh data"
    >
      <RefreshCw 
        className={cn(
          'h-4 w-4',
          isRefreshing && 'animate-spin'
        )} 
      />
    </Button>
  );
}

