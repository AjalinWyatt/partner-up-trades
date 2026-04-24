import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Plus, Check, Trash2, Tag as TagIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConvTag {
  id: string;
  name: string;
  color: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  partnerId?: string | null;
  partnerName?: string;
  onChanged?: () => void;
}

export default function ConversationTagsSheet({
  open,
  onOpenChange,
  userId,
  partnerId,
  partnerName,
  onChanged,
}: Props) {
  const manageMode = !partnerId;
  const [tags, setTags] = useState<ConvTag[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data: t } = await supabase
      .from("conversation_tags" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    setTags((t as any) || []);
    if (partnerId) {
      const { data: a } = await supabase
        .from("conversation_tag_assignments" as any)
        .select("tag_id")
        .eq("user_id", userId)
        .eq("partner_id", partnerId);
      setAssigned(new Set(((a as any) || []).map((r: any) => r.tag_id)));
    } else {
      setAssigned(new Set());
    }
    setLoading(false);
  }

  useEffect(() => {
    if (open && userId) load();
  }, [open, userId, partnerId]);

  async function createTag() {
    const name = newName.trim();
    if (!name) return;
    const { data, error } = await supabase
      .from("conversation_tags" as any)
      .insert({ user_id: userId, name, color: "primary" })
      .select()
      .single();
    if (!error && data) {
      setTags((prev) => [...prev, data as any]);
      setNewName("");
      // auto-assign only when in a chat context
      if (partnerId) await toggleAssign((data as any).id, false);
      onChanged?.();
    }
  }

  async function toggleAssign(tagId: string, isAssigned: boolean) {
    if (!partnerId) return;
    if (isAssigned) {
      await supabase
        .from("conversation_tag_assignments" as any)
        .delete()
        .eq("user_id", userId)
        .eq("partner_id", partnerId)
        .eq("tag_id", tagId);
      setAssigned((prev) => {
        const n = new Set(prev);
        n.delete(tagId);
        return n;
      });
    } else {
      await supabase
        .from("conversation_tag_assignments" as any)
        .insert({ user_id: userId, partner_id: partnerId, tag_id: tagId });
      setAssigned((prev) => new Set(prev).add(tagId));
    }
    onChanged?.();
  }

  async function deleteTag(tagId: string) {
    await supabase.from("conversation_tags" as any).delete().eq("id", tagId);
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    setAssigned((prev) => {
      const n = new Set(prev);
      n.delete(tagId);
      return n;
    });
    onChanged?.();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <TagIcon className="w-4 h-4 text-primary" />
            {manageMode ? "Manage tags" : `Tag ${partnerName}`}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Create new tag (e.g. Mentor, Local)"
              className="bg-secondary border-none rounded-xl h-10 text-sm"
              onKeyDown={(e) => e.key === "Enter" && createTag()}
              maxLength={24}
            />
            <button
              onClick={createTag}
              disabled={!newName.trim()}
              className="h-10 px-3 rounded-xl bg-primary text-primary-foreground flex items-center gap-1 text-sm font-semibold disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-xs text-muted-foreground text-center py-6">Loading…</div>
            ) : tags.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6">
                No tags yet. Create one above to start organizing.
              </div>
            ) : (
              tags.map((tag) => {
                const isOn = assigned.has(tag.id);
                return (
                  <div
                    key={tag.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors",
                      isOn ? "bg-primary/10 border border-primary/40" : "bg-secondary border border-transparent"
                    )}
                  >
                    <button
                      onClick={() => !manageMode && toggleAssign(tag.id, isOn)}
                      disabled={manageMode}
                      className="flex-1 flex items-center gap-2 text-left disabled:cursor-default"
                    >
                      {!manageMode && (
                      <div
                        className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center shrink-0",
                          isOn ? "bg-primary border-primary" : "border-muted-foreground/40"
                        )}
                      >
                        {isOn && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                      </div>
                      )}
                      <span className="text-sm font-medium text-foreground truncate">
                        {tag.name}
                      </span>
                    </button>
                    <button
                      onClick={() => deleteTag(tag.id)}
                      className="p-1.5 rounded-lg hover:bg-background/50 text-muted-foreground hover:text-destructive"
                      aria-label="Delete tag"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}