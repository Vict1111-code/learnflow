import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ResourceList, { Resource } from '@/components/ResourceList';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AISuggestedResourcesProps {
  goalDescription: string;
  masteryLevel: string;
  concepts?: Array<{ id: string; name: string; status: string }>;
  confusionPatterns?: string[];
}

export default function AISuggestedResources({
  goalDescription,
  masteryLevel,
  concepts,
  confusionPatterns,
}: AISuggestedResourcesProps) {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleSuggest = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-resources', {
        body: {
          goalDescription,
          masteryLevel,
          concepts: concepts || [],
          confusionPatterns: confusionPatterns || [],
        },
      });

      if (error) throw error;

      const suggested: Resource[] = (data?.resources || []).map((r: any) => ({
        title: r.title || 'Resource',
        url: r.url || '#',
        type: r.type || 'article',
        description: r.description || '',
      }));

      setResources(suggested);
      setFetched(true);

      if (suggested.length === 0) {
        toast.info('No additional resources found');
      }
    } catch (err) {
      console.error('Error suggesting resources:', err);
      toast.error('Failed to get resource suggestions');
    } finally {
      setLoading(false);
    }
  };

  if (fetched && resources.length > 0) {
    return <ResourceList resources={resources} />;
  }

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">AI Resource Suggestions</h3>
            <p className="text-xs text-muted-foreground">Get personalized learning resources matched to your goals</p>
          </div>
        </div>
        <Button onClick={handleSuggest} disabled={loading} size="sm" className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Finding...' : fetched ? 'Try Again' : 'Suggest Resources'}
        </Button>
      </div>
    </div>
  );
}
