import { Suspense } from "react"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Phone, Play, Clock, User, MessageSquare } from "lucide-react"

export const metadata: Metadata = {
  title: "Voicemails | M&M Admin",
  description: "Manage voicemail messages",
}

async function VoicemailList() {
  const supabase = await createClient()

  const { data: voicemails, error } = await supabase
    .from("voicemails")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("[v0] Error fetching voicemails:", error)
    return <div className="text-red-400">Error loading voicemails</div>
  }

  const statusColors: Record<string, string> = {
    new: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    listened: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    resolved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  }

  return (
    <div className="space-y-4">
      {voicemails?.map((vm) => (
        <div
          key={vm.id}
          className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${vm.status === "new" ? "bg-cyan-500/10" : "bg-white/5"}`}>
                <Phone className={`w-6 h-6 ${vm.status === "new" ? "text-cyan-400" : "text-white/40"}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-white/40" />
                  <span className="font-medium">{vm.caller_number || "Unknown"}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[vm.status] || statusColors.new}`}
                  >
                    {vm.status || "new"}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-white/40">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(vm.created_at).toLocaleString("en-AU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>
                    {vm.duration
                      ? `${Math.floor(vm.duration / 60)}:${(vm.duration % 60).toString().padStart(2, "0")}`
                      : "0:00"}
                  </span>
                </div>
              </div>
            </div>

            {vm.recording_url && (
              <button className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors">
                <Play className="w-5 h-5" />
              </button>
            )}
          </div>

          {vm.transcription && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-white/40 mt-0.5" />
                <p className="text-sm text-white/60 italic">{vm.transcription}</p>
              </div>
            </div>
          )}

          {vm.notes && (
            <div className="mt-2 p-3 rounded-lg bg-white/5 text-sm">
              <strong>Notes:</strong> {vm.notes}
            </div>
          )}
        </div>
      ))}

      {(!voicemails || voicemails.length === 0) && (
        <div className="text-center py-12 text-white/40">
          <Phone className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p>No voicemails</p>
        </div>
      )}
    </div>
  )
}

function VoicemailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-32 bg-white/5 rounded-xl" />
      ))}
    </div>
  )
}

export default function VoicemailsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Voicemails</h1>
          <p className="text-white/50 mt-1">Listen and manage voicemail messages</p>
        </div>
      </div>

      <Suspense fallback={<VoicemailSkeleton />}>
        <VoicemailList />
      </Suspense>
    </div>
  )
}
