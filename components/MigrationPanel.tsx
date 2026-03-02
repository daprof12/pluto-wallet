import { useState } from 'react';
import dataService from '../utils/dataService';
import { migrateAllDataToSupabase } from '../supabase/migrate_localstorage_to_supabase';
import { toast } from "sonner";
import { Database, Upload, CheckCircle2, XCircle, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { clearLocalStorageAfterMigration } from '../supabase/migrate_localstorage_to_supabase';

interface MigrationPanelProps {
  userId: string;
  onMigrationComplete?: () => void;
}

export default function MigrationPanel({ userId, onMigrationComplete }: MigrationPanelProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  const checkLocalStorageData = () => {
    const walletData = dataService.getItem('pluto_wallet');
    const activities = dataService.getItem('pluto_user_activities');
    const notifications = dataService.getItem(`pluto_notifications_${userId}`);
    const tickets = dataService.getItem('pluto_support_tickets');
    const fees = dataService.getItem('pluto_admin_fees');
    const assets = dataService.getItem('pluto_asset_config');

    const hasData = !!(walletData || activities || notifications || tickets || fees || assets);

    return {
      hasData,
      walletData: !!walletData,
      activities: !!activities,
      notifications: !!notifications,
      tickets: !!tickets,
      fees: !!fees,
      assets: !!assets,
    };
  };

  const localData = checkLocalStorageData();

  const handleMigrate = async () => {
    setIsMigrating(true);
    setProgress(10);

    try {
      toast.info('Starting migration...', {
        description: 'This may take a few moments',
      });

      setProgress(30);

      // Run the migration
      const result = await migrateAllDataToSupabase(userId);

      setProgress(90);
      setMigrationResult(result);

      if (result.success) {
        setProgress(100);
        setMigrationComplete(true);

        toast.success('Migration completed successfully!', {
          description: `Migrated ${result.summary.wallets} wallets, ${result.summary.transactions} transactions`,
        });

        // Mark migration as complete in localStorage
        dataService.setItem('pluto_migrated_to_supabase', 'true');
        dataService.setItem('pluto_migration_date', new Date().toISOString());

        if (onMigrationComplete) {
          onMigrationComplete();
        }
      } else {
        toast.error('Migration completed with errors', {
          description: `${result.errors.length} errors occurred`,
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Migration failed', {
        description: String(error),
      });
      setMigrationResult({
        success: false,
        errors: [String(error)],
        migratedTables: [],
        summary: {},
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClearLocalStorage = () => {
    clearLocalStorageAfterMigration();
    toast.success('Local storage cleared', {
      description: 'Data is safely stored in the cloud',
    });
  };

  // Check if already migrated
  const alreadyMigrated = dataService.getItem('pluto_migrated_to_supabase') === 'true';
  const migrationDate = dataService.getItem('pluto_migration_date');

  if (alreadyMigrated && !migrationComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Migration Already Complete
          </CardTitle>
          <CardDescription>
            Your data was migrated to Supabase on{' '}
            {migrationDate ? new Date(migrationDate).toLocaleString() : 'an earlier date'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your wallet data is already synced with Supabase. You can optionally clear local storage
              if you want to free up space.
            </AlertDescription>
          </Alert>

          {localData.hasData && (
            <div className="space-y-2">
              <p className="text-sm">Local data still present:</p>
              <ul className="text-sm space-y-1 ml-4">
                {localData.walletData && <li>✓ Wallet data</li>}
                {localData.activities && <li>✓ Transaction history</li>}
                {localData.notifications && <li>✓ Notifications</li>}
                {localData.tickets && <li>✓ Support tickets</li>}
                {localData.fees && <li>✓ Fee settings</li>}
                {localData.assets && <li>✓ Asset configuration</li>}
              </ul>
              <Button
                variant="outline"
                onClick={handleClearLocalStorage}
                className="mt-4"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Local Storage
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!localData.hasData && !migrationComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            No Data to Migrate
          </CardTitle>
          <CardDescription>
            No local storage data found. You're all set to use Supabase!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your wallet will automatically sync with Supabase as you use it.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Migrate to Supabase
        </CardTitle>
        <CardDescription>
          Sync your local wallet data to the cloud for cross-platform access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!migrationComplete && !isMigrating && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will migrate your local data to Supabase. Your local data will remain intact.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm">Data to be migrated:</p>
              <ul className="text-sm space-y-1 ml-4">
                {localData.walletData && <li>✓ Wallet data and balances</li>}
                {localData.activities && <li>✓ Transaction history</li>}
                {localData.notifications && <li>✓ Notifications</li>}
                {localData.tickets && <li>✓ Support tickets</li>}
                {localData.fees && <li>✓ Fee settings</li>}
                {localData.assets && <li>✓ Asset configuration</li>}
              </ul>
            </div>

            <Button
              onClick={handleMigrate}
              className="w-full"
              size="lg"
            >
              <Upload className="w-4 h-4 mr-2" />
              Start Migration
            </Button>
          </div>
        )}

        {isMigrating && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Migrating data to Supabase...</span>
            </div>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Please don't close this window. This may take a few moments.
            </p>
          </div>
        )}

        {migrationComplete && migrationResult && (
          <div className="space-y-4">
            {migrationResult.success ? (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900 dark:text-green-100">
                  Migration completed successfully!
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-900 dark:text-orange-100">
                  Migration completed with {migrationResult.errors.length} error(s)
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <p className="text-sm">Migration Summary:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-muted rounded">
                  <div className="font-medium">{migrationResult.summary.wallets || 0}</div>
                  <div className="text-muted-foreground text-xs">Wallets</div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="font-medium">{migrationResult.summary.transactions || 0}</div>
                  <div className="text-muted-foreground text-xs">Transactions</div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="font-medium">{migrationResult.summary.assets || 0}</div>
                  <div className="text-muted-foreground text-xs">Assets</div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="font-medium">{migrationResult.summary.notifications || 0}</div>
                  <div className="text-muted-foreground text-xs">Notifications</div>
                </div>
              </div>
            </div>

            {migrationResult.migratedTables.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm">Migrated tables:</p>
                <div className="flex flex-wrap gap-2">
                  {migrationResult.migratedTables.map((table: string) => (
                    <span
                      key={table}
                      className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded"
                    >
                      {table}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {migrationResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm flex items-center gap-2 text-orange-600">
                  <XCircle className="w-4 h-4" />
                  Errors encountered:
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {migrationResult.errors.map((error: string, index: number) => (
                    <div
                      key={index}
                      className="p-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded text-xs"
                    >
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleClearLocalStorage}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Local Storage (Optional)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}