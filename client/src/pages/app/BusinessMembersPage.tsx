import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Check,
  CircleAlert,
  Edit3,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const shell =
  "min-h-screen bg-[#f6f3ea] text-[#173c2d] dark:bg-[#10231d] dark:text-[#edf5e7]";
const panel =
  "rounded-2xl border border-[#dbe5d7] bg-[#fffdf7] shadow-[0_16px_40px_rgba(33,66,48,0.06)] dark:border-[#29483a] dark:bg-[#152b23]";
const input =
  "h-10 w-full rounded-xl border border-[#cbd9c8] bg-[#fffdf7] px-3 text-sm text-[#173c2d] outline-none transition focus:border-[#789d42] focus:ring-2 focus:ring-[#c1e86c]/40 dark:border-[#3b5b4b] dark:bg-[#11251e] dark:text-[#edf5e7]";

type MemberStatus = "active" | "expired" | "paused" | "cancelled";
type MemberForm = {
  name: string;
  contactEmail: string;
  membershipLabel: string;
  joinedAt: string;
  expiresAt: string;
  status: MemberStatus;
  sessionCredits: string;
};

const blankForm = (): MemberForm => ({
  name: "",
  contactEmail: "",
  membershipLabel: "",
  joinedAt: "",
  expiresAt: "",
  status: "active",
  sessionCredits: "",
});

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function dateInput(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function dateLabel(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

export default function BusinessMembersPage() {
  const me = trpc.auth.me.useQuery();
  const authenticated = Boolean(me.data);
  const facilities = trpc.business.myFacilities.useQuery(undefined, {
    enabled: authenticated,
  });
  const [facilityId, setFacilityId] = useState(
    new URLSearchParams(window.location.search).get("facilityId") ?? ""
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MemberForm>(blankForm);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  useEffect(() => {
    const list = facilities.data ?? [];
    if (
      list.length > 0 &&
      !list.some(facility => String(facility.id) === facilityId)
    ) {
      setFacilityId(String(list[0].id));
    }
  }, [facilities.data, facilityId]);

  const facility = (facilities.data ?? []).find(
    item => String(item.id) === facilityId
  );
  const members = trpc.business.members.list.useQuery(
    facility ? { facilityId: facility.id } : { facilityId: 0 },
    { enabled: authenticated && Boolean(facility) }
  );
  const create = trpc.business.members.create.useMutation({
    onSuccess: async () => {
      await utils.business.members.list.invalidate();
      setForm(blankForm());
      toast.success("Member added");
    },
    onError: error => toast.error(errorMessage(error)),
  });
  const update = trpc.business.members.update.useMutation({
    onSuccess: async () => {
      await utils.business.members.list.invalidate();
      setEditingId(null);
      setForm(blankForm());
      toast.success("Member updated");
    },
    onError: error => toast.error(errorMessage(error)),
  });
  const remove = trpc.business.members.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.business.members.list.invalidate(),
        utils.business.attendance.list.invalidate(),
        utils.business.dashboard.invalidate(),
      ]);
      toast.success("Member record removed");
    },
    onError: error => toast.error(errorMessage(error)),
  });

  if (me.isLoading) return <Loading />;
  if (me.isError) return <Problem message={errorMessage(me.error)} retry={() => me.refetch()} />;
  if (!me.data) return <SignIn />;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!facility || !form.name.trim()) return;

    const values = {
      name: form.name.trim(),
      contactEmail: form.contactEmail.trim() || undefined,
      membershipLabel: form.membershipLabel.trim() || undefined,
      joinedAt: form.joinedAt || undefined,
      expiresAt: form.expiresAt || undefined,
      status: form.status,
      sessionCredits:
        form.sessionCredits.trim() === ""
          ? undefined
          : Number(form.sessionCredits),
    };

    if (editingId !== null) {
      update.mutate({
        id: editingId,
        name: values.name,
        contactEmail: values.contactEmail ?? null,
        membershipLabel: values.membershipLabel ?? null,
        joinedAt: values.joinedAt,
        expiresAt: values.expiresAt ?? null,
        status: values.status,
        sessionCredits: values.sessionCredits ?? null,
      });
    } else {
      create.mutate({ facilityId: facility.id, ...values });
    }
  };

  const edit = (member: {
    id: number;
    name: string;
    contactEmail: string | null;
    membershipLabel: string | null;
    joinedAt: Date;
    expiresAt: Date | null;
    status: MemberStatus;
    sessionCredits: number | null;
  }) => {
    setEditingId(member.id);
    setForm({
      name: member.name,
      contactEmail: member.contactEmail ?? "",
      membershipLabel: member.membershipLabel ?? "",
      joinedAt: dateInput(member.joinedAt),
      expiresAt: dateInput(member.expiresAt),
      status: member.status,
      sessionCredits:
        member.sessionCredits == null ? "" : String(member.sessionCredits),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankForm());
  };

  const confirmDelete = (member: { id: number; name: string }) => {
    const confirmed = window.confirm(
      `Remove ${member.name}? This also deletes their attendance history and cannot be undone.`
    );
    if (confirmed) remove.mutate({ id: member.id });
  };

  return (
    <main className={shell}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() =>
                setLocation(
                  `/app/business?facilityId=${encodeURIComponent(facilityId)}`
                )
              }
              className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#66844a] hover:underline dark:text-[#b8d68a]"
            >
              ← Business dashboard
            </button>
            <h1 className="text-3xl font-semibold tracking-tight">Members</h1>
            <p className="mt-2 text-sm text-[#617366] dark:text-[#b3c6b9]">
              Owner-only membership records for the selected facility.
            </p>
          </div>
          <select
            aria-label="Select facility"
            className={`${input} sm:max-w-xs`}
            value={facilityId}
            onChange={event => setFacilityId(event.target.value)}
          >
            {(facilities.data ?? []).map(item => (
              <option key={String(item.id)} value={String(item.id)}>
                {item.name}
              </option>
            ))}
          </select>
        </header>

        {!facility ? (
          <Empty
            title="No facility selected"
            body="Create a facility from the business dashboard before adding members."
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
            <section className={`${panel} p-5 sm:p-6`}>
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#66844a] dark:text-[#b8d68a]">
                    {editingId !== null ? "Edit record" : "New record"}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {editingId !== null ? "Update member" : "Add a member"}
                  </h2>
                </div>
                <UserRound className="h-5 w-5 text-[#7d9d51]" />
              </div>

              <form onSubmit={submit} className="space-y-4">
                <Field
                  label="Member name"
                  value={form.name}
                  onChange={value => setForm(current => ({ ...current, name: value }))}
                  required
                />
                <Field
                  label="Contact email · private"
                  type="email"
                  value={form.contactEmail}
                  onChange={value => setForm(current => ({ ...current, contactEmail: value }))}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Membership label"
                    value={form.membershipLabel}
                    onChange={value => setForm(current => ({ ...current, membershipLabel: value }))}
                    placeholder="e.g. Monthly"
                  />
                  <label className="block text-sm font-medium">
                    Status
                    <select
                      className={`${input} mt-1`}
                      value={form.status}
                      onChange={event =>
                        setForm(current => ({
                          ...current,
                          status: event.target.value as MemberStatus,
                        }))
                      }
                    >
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="paused">Paused</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Joined at"
                    type="date"
                    value={form.joinedAt}
                    onChange={value => setForm(current => ({ ...current, joinedAt: value }))}
                    required={editingId !== null}
                  />
                  <Field
                    label="Expires at"
                    type="date"
                    value={form.expiresAt}
                    onChange={value => setForm(current => ({ ...current, expiresAt: value }))}
                  />
                </div>
                <Field
                  label="Session credits"
                  type="number"
                  min="0"
                  step="1"
                  value={form.sessionCredits}
                  onChange={value => setForm(current => ({ ...current, sessionCredits: value }))}
                />
                <p className="text-xs leading-5 text-[#718278] dark:text-[#a7bbaa]">
                  Contact details are private to this facility. No emails or push
                  reminders are sent from this app.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={create.isPending || update.isPending || !form.name.trim()}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#274f39] px-4 text-sm font-semibold text-white hover:bg-[#1d402e] disabled:opacity-50 dark:bg-[#c1e86c] dark:text-[#153322]"
                  >
                    {editingId !== null ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editingId !== null ? "Save changes" : "Add member"}
                  </button>
                  {editingId !== null && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#cbd9c8] px-4 text-sm font-semibold hover:bg-[#e8f1df] dark:border-[#3b5b4b] dark:hover:bg-[#1d3b2e]"
                    >
                      <X className="h-4 w-4" /> Cancel
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className={`${panel} overflow-hidden`}>
              <div className="border-b border-[#e2eadf] p-5 dark:border-[#29483a]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#66844a] dark:text-[#b8d68a]">
                      Private owner view
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">Member list</h2>
                  </div>
                  <span className="rounded-full bg-[#e6f4c4] px-3 py-1 text-xs font-semibold text-[#416c3a] dark:bg-[#2c5136] dark:text-[#d5eea7]">
                    {members.data?.length ?? 0} records
                  </span>
                </div>
              </div>
              {members.isLoading ? (
                <InlineLoading />
              ) : members.isError ? (
                <div className="p-5">
                  <InlineError message={errorMessage(members.error)} retry={() => members.refetch()} />
                </div>
              ) : members.data?.length ? (
                <div className="divide-y divide-[#e2eadf] dark:divide-[#29483a]">
                  {members.data.map(member => (
                    <div key={String(member.id)} className="p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold">{member.name}</p>
                          <p className="mt-1 text-xs text-[#718278] dark:text-[#a7bbaa]">
                            {[member.membershipLabel, member.status].filter(Boolean).join(" · ") || "No label"}
                          </p>
                          {member.contactEmail && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-[#617366] dark:text-[#b3c6b9]">
                              <Mail className="h-3.5 w-3.5" />
                              {member.contactEmail}
                              <span className="text-[10px] uppercase tracking-wide">private</span>
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => edit(member)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#cbd9c8] px-2.5 text-xs font-semibold hover:bg-[#e8f1df] dark:border-[#3b5b4b] dark:hover:bg-[#1d3b2e]"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmDelete(member)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e4bcb1] px-2.5 text-xs font-semibold text-[#974d3f] hover:bg-[#fff1ec] dark:border-[#633d35] dark:hover:bg-[#3a2825]"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                        <Info label="Joined" value={dateLabel(member.joinedAt)} />
                        <Info label="Expires" value={dateLabel(member.expiresAt)} />
                        <Info label="Credits" value={member.sessionCredits == null ? "—" : String(member.sessionCredits)} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5">
                  <Empty title="No members yet" body="Add the first member record for this facility." />
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        required={required}
        min={min}
        step={step}
        type={type}
        placeholder={placeholder}
        className={`${input} mt-1`}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[#8a9b8d]">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#cbd9c8] p-5 dark:border-[#3b5b4b]">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm leading-5 text-[#718278] dark:text-[#a7bbaa]">{body}</p>
    </div>
  );
}

function InlineLoading() {
  return (
    <div className="flex items-center gap-2 p-6 text-sm text-[#718278] dark:text-[#a7bbaa]">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading real members…
    </div>
  );
}

function InlineError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="rounded-xl border border-[#efc7bb] bg-[#fff3ef] p-4 text-sm text-[#8d4839] dark:border-[#633d35] dark:bg-[#3a2825] dark:text-[#f1b9aa]">
      <p>{message}</p>
      <button onClick={retry} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline">
        <RefreshCw className="h-3 w-3" /> Retry
      </button>
    </div>
  );
}

function SignIn() {
  return (
    <main className={shell}>
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-5">
        <section className={`${panel} w-full p-8 text-center`}>
          <Building2 className="mx-auto h-9 w-9 text-[#7d9d51]" />
          <h1 className="mt-4 text-2xl font-semibold">Sign in to view members</h1>
          <p className="mt-2 text-sm text-[#617366] dark:text-[#b3c6b9]">
            Member records are private to facility owners.
          </p>
          <button
            onClick={() => startLogin()}
            className="mt-6 inline-flex h-10 items-center rounded-xl bg-[#274f39] px-5 text-sm font-semibold text-white dark:bg-[#c1e86c] dark:text-[#153322]"
          >
            Sign in
          </button>
        </section>
      </div>
    </main>
  );
}

function Loading() {
  return (
    <main className={shell}>
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-[#617366]">
        <Loader2 className="h-5 w-5 animate-spin" /> Opening members…
      </div>
    </main>
  );
}

function Problem({ message, retry }: { message: string; retry: () => void }) {
  return (
    <main className={shell}>
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-5">
        <div className={`${panel} w-full p-8 text-center`}>
          <CircleAlert className="mx-auto h-8 w-8 text-[#a34b39]" />
          <h1 className="mt-4 text-xl font-semibold">Couldn’t load this page</h1>
          <p className="mt-2 text-sm text-[#617366] dark:text-[#b3c6b9]">{message}</p>
          <button
            onClick={retry}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[#274f39] px-4 text-sm font-semibold text-white dark:bg-[#c1e86c] dark:text-[#153322]"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      </div>
    </main>
  );
}
