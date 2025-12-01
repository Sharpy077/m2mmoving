"use client"

import { useState, useEffect, useMemo } from "react"
import { Phone, Clock, MessageSquare, CheckCircle, Archive, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  filterVoicemailsByStatus,
  formatDuration,
  formatMelbourneDate,
  type VoicemailFilter,
  type VoicemailRecord,
} from "@/lib/voicemails/utils"

export function VoicemailsDashboard() {
  const [voicemails, setVoicemails] = useState<VoicemailRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVoicemail, setSelectedVoicemail] = useState<VoicemailRecord | null>(null)
  const [filter, setFilter] = useState<VoicemailFilter>("all")

  useEffect(() => {
    fetchVoicemails()
  }, [])

  async function fetchVoicemails() {
    try {
      const response = await fetch("/api/voicemails")
      const data = await response.json()
      setVoicemails(data.voicemails || [])
    } catch (error) {
      console.error("Failed to fetch voicemails:", error)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await fetch("/api/voicemails", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      fetchVoicemails()
    } catch (error) {
      console.error("Failed to update status:", error)
    }
  }

  const filteredVoicemails = useMemo(
    () => filterVoicemailsByStatus(voicemails, filter),
    [voicemails, filter],
  )

  const statusCounts = useMemo(
    () => ({
      new: voicemails.filter((v) => v.status === "new").length,
      listened: voicemails.filter((v) => v.status === "listened").length,
      followed_up: voicemails.filter((v) => v.status === "followed_up").length,
    }),
    [voicemails],
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground">NEW_MESSAGES</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{statusCounts.new}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground">LISTENED</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{statusCounts.listened}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground">FOLLOWED_UP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary">{statusCounts.followed_up}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {["all", "new", "listened", "followed_up", "archived"].map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
            className={
              filter === status
                ? "bg-primary hover:bg-primary/90 border-0"
                : "border-border bg-transparent hover:bg-muted"
            }
          >
            {status.toUpperCase().replace("_", " ")}
          </Button>
        ))}
      </div>

      {/* Voicemails List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading voicemails...</div>
      ) : filteredVoicemails.length === 0 ? (
        <div className="text-center py-12">
          <Phone className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No voicemails found</p>
          <p className="text-muted-foreground/70 text-sm mt-2">
            Voicemails will appear here once Twilio is configured and calls are received
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVoicemails.map((voicemail) => (
            <Card
              key={voicemail.id}
              className={`bg-card border-border cursor-pointer transition-colors hover:border-primary/50 ${
                voicemail.status === "new" ? "border-l-4 border-l-primary" : ""
              }`}
              onClick={() => setSelectedVoicemail(voicemail)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-lg text-foreground">{voicemail.caller_number}</span>
                      <span
                        className={`px-2 py-0.5 text-xs font-mono ${
                          voicemail.status === "new"
                            ? "bg-primary text-primary-foreground"
                            : voicemail.status === "listened"
                              ? "bg-yellow-600 text-white"
                              : voicemail.status === "followed_up"
                                ? "bg-secondary text-secondary-foreground"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {voicemail.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatMelbourneDate(voicemail.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Play className="w-4 h-4" />
                        {formatDuration(voicemail.duration)}
                      </span>
                    </div>
                    {voicemail.transcription && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{voicemail.transcription}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {voicemail.recording_url && (
                      <a
                        href={voicemail.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button size="sm" variant="outline" className="border-border bg-transparent hover:bg-muted">
                          <Play className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedVoicemail && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <Card className="bg-card border-border max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="font-mono">VOICEMAIL_DETAIL</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedVoicemail(null)} className="hover:bg-muted">
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-1">CALLER</p>
                  <p className="font-mono text-lg text-foreground">{selectedVoicemail.caller_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-1">DURATION</p>
                  <p className="font-mono text-lg text-foreground">{formatDuration(selectedVoicemail.duration)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-1">RECEIVED</p>
                  <p className="font-mono text-foreground">{formatMelbourneDate(selectedVoicemail.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-1">STATUS</p>
                  <p className="font-mono text-foreground">{selectedVoicemail.status.toUpperCase()}</p>
                </div>
              </div>

              {selectedVoicemail.recording_url && (
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-2">RECORDING</p>
                  <audio controls src={selectedVoicemail.recording_url} className="w-full" />
                </div>
              )}

              {selectedVoicemail.transcription && (
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-2">TRANSCRIPTION</p>
                  <div className="bg-muted/50 border border-border p-4">
                    <p className="text-foreground">{selectedVoicemail.transcription}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground font-mono mb-2">UPDATE_STATUS</p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-yellow-600 text-yellow-500 hover:bg-yellow-600 hover:text-white bg-transparent"
                    onClick={() => {
                      updateStatus(selectedVoicemail.id, "listened")
                      setSelectedVoicemail({ ...selectedVoicemail, status: "listened" })
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Mark Listened
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground bg-transparent"
                    onClick={() => {
                      updateStatus(selectedVoicemail.id, "followed_up")
                      setSelectedVoicemail({ ...selectedVoicemail, status: "followed_up" })
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Followed Up
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-muted-foreground text-muted-foreground hover:bg-muted bg-transparent"
                    onClick={() => {
                      updateStatus(selectedVoicemail.id, "archived")
                      setSelectedVoicemail({ ...selectedVoicemail, status: "archived" })
                    }}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
