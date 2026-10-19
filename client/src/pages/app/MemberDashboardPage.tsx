import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Compass,
  Heart,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const shell = "min-h-screen bg-[#f6f3ea] text-[#173c2d] dark:bg-[#10231d] dark:text-[#edf5e7]";
const panel = "rounded-2xl border border-[#dbe5d7] bg-[#fffdf7] shadow-[0_16px_40px_rgba(33,66,48,0.06)] dark:border-[#29483a] dark:bg-[#152b23]";
const input = "h-10 w-full rounded-xl border border-[#cbd9c8] bg-[#fffdf7] px-3 text-sm text-[#173c2d] outline-none transition focus:border-[#789d42] focus:ring-2 focus:ring-[#c1e86c]/40 dark:border-[#3b5b4b] dark:bg-[#11251e] dark:text-[#edf5e7]";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function dateLabel(value: unknown) {
  if (!value) return "No date set";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function SignInState() {
  return (
    <main className={shell}>
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-5 py-12">
        <section className={`${panel} w-full p-8 text-center sm:p-10`}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dff4aa] text-[#315c30] dark:bg-[#315b3c] dark:text-[#dff4aa]"><Heart className="h-6 w-6" /></div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#66844a] dark:text-[#b8d68a]">TasseiGō member space</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your progress, kept private.</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#617366] dark:text-[#b3c6b9]">Sign in to see your saved facilities, reviews, milestones, and challenges. Nothing is loaded until you do.</p>
          <button onClick={() => startLogin()} className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#274f39] px-6 text-sm font-semibold text-white transition hover:bg-[#1d402e] focus:outline-none focus:ring-2 focus:ring-[#c1e86c] dark:bg-[#c1e86c] dark:text-[#153322] dark:hover:bg-[#d6f58c]">Sign in <ArrowRight className="h-4 w-4" /></button>
        </section>
      </div>
    </main>
  );
}

export default function MemberDashboardPage() {
  const me = trpc.auth.me.useQuery();
  const isAuthenticated = Boolean(me.data);
  const dashboard = trpc.member.dashboard.useQuery(undefined, { enabled: isAuthenticated });
  const milestones = trpc.member.milestones.list.useQuery(undefined, { enabled: isAuthenticated });
  const challenges = trpc.member.challenges.list.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const createMilestone = trpc.member.milestones.create.useMutation({ onSuccess: async () => { await utils.member.milestones.list.invalidate(); toast.success("Milestone added"); }, onError: error => toast.error(errorMessage(error)) });
  const updateMilestone = trpc.member.milestones.update.useMutation({ onSuccess: async () => { await utils.member.milestones.list.invalidate(); toast.success("Milestone updated"); }, onError: error => toast.error(errorMessage(error)) });
  const deleteMilestone = trpc.member.milestones.delete.useMutation({ onSuccess: async () => { await utils.member.milestones.list.invalidate(); toast.success("Milestone deleted"); }, onError: error => toast.error(errorMessage(error)) });
  const joinChallenge = trpc.member.challenges.join.useMutation({ onSuccess: async () => { await Promise.all([utils.member.challenges.list.invalidate(), utils.member.dashboard.invalidate()]); toast.success("Challenge joined"); }, onError: error => toast.error(errorMessage(error)) });
  const updateProgress = trpc.member.challenges.updateProgress.useMutation({ onSuccess: async () => { await Promise.all([utils.member.challenges.list.invalidate(), utils.member.dashboard.invalidate()]); toast.success("Progress saved"); }, onError: error => toast.error(errorMessage(error)) });

  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");

  if (me.isLoading) return <LoadingState label="Opening your member space…" />;
  if (me.isError) return <ProblemState message={errorMessage(me.error)} onRetry={() => me.refetch()} />;
  if (!me.data) return <SignInState />;

  const dashboardData = dashboard.data;
  const favoriteFacilities = dashboardData?.favorites ?? [];
  const reviews = dashboardData?.reviews ?? [];
  const joinedChallenges = dashboardData?.joinedChallenges ?? [];
  const milestoneItems = milestones.data ?? [];

  function isJoined(challengeId: string | number) {
    return joinedChallenges.some(item => String(item.id) === String(challengeId));
  }

  return (
    <main className={shell}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#66844a] dark:text-[#b8d68a]"><Sparkles className="h-3.5 w-3.5" /> Member workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Keep moving, {me.data.name?.split(" ")[0] ?? "there"}.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#617366] dark:text-[#b3c6b9]">A quiet place for the routines and places you choose to return to.</p>
          </div>
          <button onClick={() => { dashboard.refetch(); milestones.refetch(); challenges.refetch(); }} className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-[#cbd9c8] bg-transparent px-4 text-sm font-medium transition hover:bg-[#e8f1df] dark:border-[#3b5b4b] dark:hover:bg-[#1d3b2e]"><RefreshCw className={`h-4 w-4 ${dashboard.isFetching ? "animate-spin" : ""}`} /> Refresh</button>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className={`${panel} p-5 sm:p-6`}>
            <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#66844a] dark:text-[#b8d68a]">Your places</p><h2 className="mt-1 text-xl font-semibold">Saved facilities</h2></div><Heart className="h-5 w-5 text-[#7d9d51]" /></div>
            {dashboard.isLoading ? <InlineLoading /> : dashboard.isError ? <InlineError message={errorMessage(dashboard.error)} onRetry={() => dashboard.refetch()} /> : favoriteFacilities.length === 0 ? <EmptyBlock icon={<Compass className="h-5 w-5" />} title="No saved facilities yet" body="When you save a place you like, it will appear here." /> : <div className="space-y-3">{favoriteFacilities.map((facility: { id?: string | number; name?: string; category?: string; city?: string; area?: string }) => <div key={String(facility.id ?? facility.name)} className="flex items-center gap-3 rounded-xl border border-[#e2eadf] bg-[#fafcf5] p-3 dark:border-[#29483a] dark:bg-[#12261f]"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f4c4] text-[#416c3a] dark:bg-[#2c5136] dark:text-[#d5eea7]"><MapPin className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate font-medium">{facility.name ?? "Saved facility"}</p><p className="text-xs capitalize text-[#718278] dark:text-[#a7bbaa]">{[facility.category, facility.area, facility.city].filter(Boolean).join(" · ") || "Facility details available"}</p></div></div>)}</div>}
          </section>

          <section className={`${panel} p-5 sm:p-6`}>
            <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#66844a] dark:text-[#b8d68a]">Your voice</p><h2 className="mt-1 text-xl font-semibold">Reviews</h2></div><Award className="h-5 w-5 text-[#7d9d51]" /></div>
            {dashboard.isLoading ? <InlineLoading /> : reviews.length === 0 ? <EmptyBlock icon={<Award className="h-5 w-5" />} title="No reviews yet" body="Your reviews will live here after you share an experience." /> : <div className="space-y-3">{reviews.map(review => <article key={String(review.id ?? review.createdAt)} className="rounded-xl border border-[#e2eadf] p-3 dark:border-[#29483a]"><div className="flex items-center justify-between gap-3"><p className="font-medium">{review.facilityName ?? "Facility review"}</p>{review.rating != null && <span className="text-xs font-semibold text-[#66844a]">{review.rating}/5</span>}</div><p className="mt-1 text-sm leading-5 text-[#617366] dark:text-[#b3c6b9]">{review.body}</p></article>)}</div>}
          </section>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className={`${panel} p-5 sm:p-6`}>
            <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#66844a] dark:text-[#b8d68a]">Small steps</p><h2 className="mt-1 text-xl font-semibold">Milestones</h2></div><Target className="h-5 w-5 text-[#7d9d51]" /></div>
            <form onSubmit={event => { event.preventDefault(); if (!title.trim()) return; createMilestone.mutate({ title: title.trim(), targetDate: targetDate || undefined }); setTitle(""); setTargetDate(""); }} className="mb-5 flex flex-col gap-2 rounded-xl bg-[#f1f6e9] p-3 dark:bg-[#1b382b] sm:flex-row sm:items-end"><label className="min-w-0 flex-1 text-xs font-medium text-[#526b5a] dark:text-[#c5d5c4]">New milestone<input className={`${input} mt-1`} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Three yoga sessions" /></label><label className="sm:w-40 text-xs font-medium text-[#526b5a] dark:text-[#c5d5c4]">Target date<input className={`${input} mt-1`} type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)} /></label><button disabled={createMilestone.isPending || !title.trim()} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#274f39] px-4 text-sm font-semibold text-white transition hover:bg-[#1d402e] disabled:opacity-50 dark:bg-[#c1e86c] dark:text-[#153322]"><Plus className="h-4 w-4" /> Add</button></form>
            {milestones.isLoading ? <InlineLoading /> : milestones.isError ? <InlineError message={errorMessage(milestones.error)} onRetry={() => milestones.refetch()} /> : milestoneItems.length === 0 ? <EmptyBlock icon={<Target className="h-5 w-5" />} title="Start with one intention" body="Add a milestone that feels useful for your routine." /> : <div className="space-y-2">{milestoneItems.map(milestone => <div key={String(milestone.id)} className="flex items-center gap-3 rounded-xl border border-[#e2eadf] p-3 dark:border-[#29483a]"><button aria-label={milestone.completed ? "Mark incomplete" : "Mark complete"} onClick={() => updateMilestone.mutate({ id: milestone.id, completed: !milestone.completed })} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${milestone.completed ? "border-[#7a9f50] bg-[#c1e86c] text-[#173c2d]" : "border-[#b9ccb5] text-transparent hover:border-[#7a9f50] dark:border-[#4d6c59]"}`}><Check className="h-4 w-4" /></button><div className="min-w-0 flex-1"><p className={`font-medium ${milestone.completed ? "text-[#75877b] line-through dark:text-[#83998a]" : ""}`}>{milestone.title}</p><p className="text-xs text-[#718278] dark:text-[#a7bbaa]">{milestone.targetDate ? `Target ${dateLabel(milestone.targetDate)}` : "No target date"}</p></div><button aria-label={`Delete ${milestone.title}`} onClick={() => deleteMilestone.mutate({ id: milestone.id })} className="rounded-lg p-2 text-[#8a9b8d] transition hover:bg-[#f9e6df] hover:text-[#a34b39] dark:hover:bg-[#452c28]"><Trash2 className="h-4 w-4" /></button></div>)}</div>}
          </section>

          <section className={`${panel} p-5 sm:p-6`}>
            <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#66844a] dark:text-[#b8d68a]">Keep showing up</p><h2 className="mt-1 text-xl font-semibold">Active challenges</h2></div><Trophy className="h-5 w-5 text-[#7d9d51]" /></div>
            {challenges.isLoading ? <InlineLoading /> : challenges.isError ? <InlineError message={errorMessage(challenges.error)} onRetry={() => challenges.refetch()} /> : challenges.data?.length === 0 ? <EmptyBlock icon={<Trophy className="h-5 w-5" />} title="No active challenges" body="Published facility challenges will appear here when they are available." /> : <div className="grid gap-3 sm:grid-cols-2">{challenges.data?.map(challenge => { const joined = isJoined(challenge.id); const joinedItem = joinedChallenges.find(item => String(item.id) === String(challenge.id)); const progress = joinedItem?.progress ?? 0; return <article key={String(challenge.id)} className="flex flex-col rounded-xl border border-[#e2eadf] p-4 dark:border-[#29483a]"><div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{challenge.title}</h3>{joinedItem && progress >= challenge.targetCount && <span className="inline-flex items-center gap-1 rounded-full bg-[#e4f4bc] px-2 py-1 text-[10px] font-semibold text-[#416c3a] dark:bg-[#2c5136] dark:text-[#d5eea7]"><CheckCircle2 className="h-3 w-3" /> Complete</span>}</div><p className="mt-1 line-clamp-3 text-sm leading-5 text-[#617366] dark:text-[#b3c6b9]">{challenge.description || "A challenge from a published facility."}</p><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#718278] dark:text-[#a7bbaa]"><span><Clock3 className="mr-1 inline h-3.5 w-3.5" />{dateLabel(challenge.endsAt)}</span>{challenge.targetCount != null && <span>{challenge.targetCount} target</span>}</div>{joined ? <div className="mt-auto pt-4"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium">Your progress</span><span>{progress}{challenge.targetCount != null ? ` / ${challenge.targetCount}` : ""}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#e3eadf] dark:bg-[#29483a]"><div className="h-full rounded-full bg-[#9bc653] transition-all" style={{ width: `${challenge.targetCount ? Math.min(100, (progress / challenge.targetCount) * 100) : 0}%` }} /></div><div className="mt-2 flex items-center gap-2"><input aria-label={`Progress for ${challenge.title}`} className={`${input} h-9`} type="number" min="0" value={progress} onChange={event => updateProgress.mutate({ challengeId: challenge.id, progress: Number(event.target.value) })} /><span className="text-xs text-[#718278]">Update</span></div></div> : <button onClick={() => joinChallenge.mutate({ challengeId: challenge.id })} disabled={joinChallenge.isPending} className="mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#274f39] px-3 text-xs font-semibold text-white transition hover:bg-[#1d402e] disabled:opacity-50 dark:bg-[#c1e86c] dark:text-[#153322]"><Plus className="h-3.5 w-3.5" /> Join challenge</button>}</article>; })}</div>}
          </section>
        </div>

        {joinedChallenges.some(challenge => challenge.progress >= challenge.targetCount) && <div className="mt-5 rounded-2xl border border-[#c9dfaa] bg-[#eef7d9] p-4 text-sm text-[#416c3a] dark:border-[#456d43] dark:bg-[#1c392b] dark:text-[#d5eea7]"><Award className="mr-2 inline h-4 w-4" /> Completed challenges can earn a digital badge. Badges have no monetary value.</div>}
      </div>
    </main>
  );
}

function LoadingState({ label }: { label: string }) { return <main className={shell}><div className="flex min-h-screen items-center justify-center gap-3 text-sm text-[#617366] dark:text-[#b3c6b9]"><Loader2 className="h-5 w-5 animate-spin" />{label}</div></main>; }
function ProblemState({ message, onRetry }: { message: string; onRetry: () => void }) { return <main className={shell}><div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-5"><div className={`${panel} w-full p-8 text-center`}><CircleAlert className="mx-auto h-8 w-8 text-[#a34b39]" /><h1 className="mt-4 text-xl font-semibold">We couldn’t open your workspace</h1><p className="mt-2 text-sm text-[#617366] dark:text-[#b3c6b9]">{message}</p><button onClick={onRetry} className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[#274f39] px-4 text-sm font-semibold text-white dark:bg-[#c1e86c] dark:text-[#153322]"><RefreshCw className="h-4 w-4" /> Try again</button></div></div></main>; }
function InlineLoading() { return <div className="flex items-center gap-2 py-7 text-sm text-[#718278] dark:text-[#a7bbaa]"><Loader2 className="h-4 w-4 animate-spin" />Loading your data…</div>; }
function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="rounded-xl border border-[#efc7bb] bg-[#fff3ef] p-4 text-sm text-[#8d4839] dark:border-[#633d35] dark:bg-[#3a2825] dark:text-[#f1b9aa]"><p>{message}</p><button onClick={onRetry} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold underline"><RefreshCw className="h-3 w-3" /> Retry</button></div>; }
function EmptyBlock({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) { return <div className="rounded-xl border border-dashed border-[#cbd9c8] p-5 dark:border-[#3b5b4b]"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e6f4c4] text-[#416c3a] dark:bg-[#2c5136] dark:text-[#d5eea7]">{icon}</div><p className="mt-3 font-medium">{title}</p><p className="mt-1 text-sm leading-5 text-[#718278] dark:text-[#a7bbaa]">{body}</p></div>; }
