import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Plus, KeyRound, Copy, LogOut, Check, X, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  listStudyGroups, getGroupMembers, createStudyGroup, requestJoinGroup, joinByInviteCode,
  approveGroupMember, removeGroupMember, leaveGroup, getAuthorProfiles, StudyGroup,
} from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

function GroupCard({ group, currentUserId }: { group: StudyGroup; currentUserId: string }) {
  const qc = useQueryClient();
  const { data: members = [] } = useQuery({
    queryKey: ['group-members', group.id],
    queryFn: () => getGroupMembers(group.id),
  });
  const userIds = useMemo(() => members.map((m) => m.user_id), [members]);
  const { data: authors = {} } = useQuery({
    queryKey: ['group-author-profiles', group.id, userIds.join(',')],
    queryFn: () => getAuthorProfiles(userIds),
    enabled: userIds.length > 0,
  });

  const myMembership = members.find((m) => m.user_id === currentUserId);
  const isOwner = group.owner_id === currentUserId;
  const approved = members.filter((m) => m.status === 'approved');
  const pending = members.filter((m) => m.status === 'pending');

  const reload = () => {
    qc.invalidateQueries({ queryKey: ['group-members', group.id] });
    qc.invalidateQueries({ queryKey: ['study-groups'] });
  };

  const handleRequest = async () => {
    try { await requestJoinGroup(group.id, currentUserId); toast.success('Request sent'); reload(); }
    catch (e: any) { toast.error(e?.message || 'Failed'); }
  };
  const handleLeave = async () => {
    try { await leaveGroup(group.id, currentUserId); toast.success('Left group'); reload(); }
    catch { toast.error('Failed to leave'); }
  };

  return (
    <motion.div layout className="glass-card rounded-xl p-4 transition-all hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-base font-semibold">{group.name}</h3>
            {isOwner && <Crown className="h-3.5 w-3.5 text-xp" />}
          </div>
          {group.topic && <span className="mt-1 inline-block rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">#{group.topic}</span>}
          {group.description && <p className="mt-2 text-sm text-muted-foreground">{group.description}</p>}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{approved.length} member{approved.length === 1 ? '' : 's'}</span>
            {isOwner && pending.length > 0 && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">{pending.length} pending</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          {!myMembership && (
            <Button size="sm" onClick={handleRequest}>Request</Button>
          )}
          {myMembership?.status === 'pending' && (
            <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">Pending</span>
          )}
          {myMembership?.status === 'approved' && !isOwner && (
            <Button size="sm" variant="ghost" onClick={handleLeave} className="text-muted-foreground hover:text-destructive">
              <LogOut className="mr-1 h-3 w-3" /> Leave
            </Button>
          )}
          {isOwner && (
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(group.invite_code); toast.success('Invite code copied'); }}>
              <Copy className="mr-1 h-3 w-3" /> {group.invite_code}
            </Button>
          )}
        </div>
      </div>

      {isOwner && pending.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
          <p className="text-xs font-semibold text-muted-foreground">Pending requests</p>
          {pending.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-2 py-1.5">
              <span className="truncate text-sm text-foreground">{authors[m.user_id]?.name || 'User'}</span>
              <div className="flex gap-1">
                <button
                  onClick={async () => { try { await approveGroupMember(m.id); toast.success('Approved'); reload(); } catch { toast.error('Failed'); } }}
                  className="rounded-md bg-emerald-500/10 p-1 text-emerald-400 hover:bg-emerald-500/20"
                  title="Approve"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={async () => { try { await removeGroupMember(m.id); reload(); } catch { toast.error('Failed'); } }}
                  className="rounded-md bg-destructive/10 p-1 text-destructive hover:bg-destructive/20"
                  title="Reject"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function CreateGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (name.trim().length < 3 || name.length > 80) { toast.error('Name must be 3–80 chars'); return; }
    setBusy(true);
    try {
      await createStudyGroup({ name: name.trim(), description: description.trim(), topic: topic.trim(), ownerId: user.id });
      toast.success('Group created');
      onOpenChange(false);
      setName(''); setTopic(''); setDescription('');
      qc.invalidateQueries({ queryKey: ['study-groups'] });
    } catch { toast.error('Failed to create group'); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Study Group</DialogTitle>
          <DialogDescription>Build an accountability circle. You'll get an invite code to share.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" required maxLength={80}
            className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm focus:border-primary focus:outline-none" />
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (optional)" maxLength={50}
            className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm focus:border-primary focus:outline-none" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={3} maxLength={500}
            className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm focus:border-primary focus:outline-none" />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={busy} className="flex-1 bg-gradient-primary text-primary-foreground">{busy ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function JoinByCodeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      await joinByInviteCode(code, user.id);
      toast.success('Joined group');
      onOpenChange(false); setCode('');
      qc.invalidateQueries({ queryKey: ['study-groups'] });
      qc.invalidateQueries({ queryKey: ['group-members'] });
    } catch (e: any) { toast.error(e?.message || 'Invalid invite code'); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join by Invite Code</DialogTitle>
          <DialogDescription>Paste a group invite code to join instantly.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="abc12345" required maxLength={32}
            className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2.5 font-mono text-sm focus:border-primary focus:outline-none" />
          <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground">{busy ? 'Joining...' : 'Join'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function StudyGroupsTab() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['study-groups'],
    queryFn: () => listStudyGroups(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Study Groups</h2>
          <p className="text-sm text-muted-foreground">Find your accountability circle.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setJoinOpen(true)}><KeyRound className="mr-2 h-4 w-4" />Join by code</Button>
          <Button onClick={() => setCreateOpen(true)} className="bg-gradient-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4" />Create</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : groups.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No groups yet. Create the first one.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((g) => user && <GroupCard key={g.id} group={g} currentUserId={user.id} />)}
        </div>
      )}

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
      <JoinByCodeDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );
}
