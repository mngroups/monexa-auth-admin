"use client";

import { usePermissions } from "@mono/auth/react";
import { useIsMobile } from "@mono/hooks";
import type { TableColumn } from "@mono/ui";
import {
  Button,
  CardSummary,
  DataTable,
  type DateRange,
  DateRangePicker,
  FloatingInput,
  FloatingSelect,
  Form,
  MobileCardList,
  MobileDataCard,
  PageHeader,
  TableSkeleton,
} from "@mono/ui";
import { getErrorMessage } from "@mono/utils";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { useOrgs } from "@/features/orgs/hooks/use-orgs";
import { ADMIN_PERMISSIONS } from "@/lib/permissions/admin";
import { toRangeParams } from "../helpers/range";
import { useActivity } from "../hooks/use-activity";
import type { ActivityEntry } from "../schema";

const PAGE_SIZE = 10;
const ALL_ORGS = "all";

type Filters = { orgId: string; action: string };

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso)
  );

const dash = (value?: string | null) => value || "-";

function ActionPill({ action }: { action: string }) {
  return (
    <span className="inline-block rounded-md bg-muted px-2 py-0.5 font-mono text-xs">{action}</span>
  );
}

function Target({ entry }: { entry: ActivityEntry }) {
  if (!entry.targetType && !entry.targetId) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="min-w-0">
      <div className="truncate">{dash(entry.targetType)}</div>
      <div className="truncate font-mono text-xs text-muted-foreground">{dash(entry.targetId)}</div>
    </div>
  );
}

export function ActivityPage() {
  const isMobile = useIsMobile();
  const { has } = usePermissions();
  const scope = has(ADMIN_PERMISSIONS.platformAll) ? "platform" : "org";
  const isPlatform = scope === "platform";

  const form = useForm<Filters>({ defaultValues: { orgId: ALL_ORGS, action: "" } });
  const orgId = form.watch("orgId");
  const actionText = form.watch("action");
  const [action, setAction] = useState("");
  const [range, setRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);

  // Debounce the action text so typing doesn't fire one request per key.
  useEffect(() => {
    const timer = setTimeout(() => {
      setAction(actionText.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [actionText]);

  const orgs = useOrgs({ page: 1, pageSize: 100 }, isPlatform);
  const orgOptions = useMemo(
    () => [
      { label: "Semua organisasi", value: ALL_ORGS },
      ...(orgs.data?.items ?? []).map((o) => ({ label: o.name, value: o.id })),
    ],
    [orgs.data]
  );

  const bounds = toRangeParams(range);
  const activity = useActivity({
    scope,
    page,
    pageSize: PAGE_SIZE,
    ...(action ? { action } : {}),
    ...bounds,
    ...(isPlatform && orgId !== ALL_ORGS ? { orgId } : {}),
  });
  const items = activity.data?.items ?? [];
  const total = activity.data?.total ?? 0;
  const loading = activity.isLoading;
  const filtered = action !== "" || range !== undefined || orgId !== ALL_ORGS;

  function reset() {
    form.reset({ orgId: ALL_ORGS, action: "" });
    setAction("");
    setRange(undefined);
    setPage(1);
  }

  const orgName = (id?: string | null) =>
    id ? (orgs.data?.items.find((o) => o.id === id)?.name ?? id) : "-";

  const columns: TableColumn<ActivityEntry>[] = [
    { id: "at", header: "Waktu", cell: (e) => formatTime(e.at) },
    { id: "action", header: "Aksi", cell: (e) => <ActionPill action={e.action} /> },
    { id: "target", header: "Target", cell: (e) => <Target entry={e} /> },
    { id: "org", header: "Organisasi", cell: (e) => orgName(e.orgId) },
    {
      id: "actor",
      header: "Pelaku",
      cell: (e) => <span className="font-mono text-xs">{dash(e.actorUserId)}</span>,
    },
    { id: "ip", header: "IP", cell: (e) => dash(e.ip) },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader title="Aktivitas" subtitle="Riwayat tindakan admin pada organisasi." />

      <Form {...form}>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="grid items-start gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
        >
          {isPlatform && (
            <FloatingSelect
              control={form.control}
              name="orgId"
              label="Organisasi"
              options={orgOptions}
              loading={orgs.isLoading}
              onOptionSelect={() => setPage(1)}
            />
          )}
          <FloatingInput control={form.control} name="action" label="Aksi" />
          <DateRangePicker
            value={range}
            onChange={(next) => {
              setRange(next);
              setPage(1);
            }}
            placeholder="Rentang tanggal"
            className="w-full"
          />
          <Button type="button" variant="secondary" onClick={reset} disabled={!filtered}>
            Reset filter
          </Button>
        </form>
      </Form>

      {activity.isError && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(activity.error)}
        </p>
      )}

      {loading ? (
        <div data-testid="activity-skeleton">
          {isMobile ? (
            <MobileCardList items={[]} isLoading keyOf={() => ""} renderCard={() => null} />
          ) : (
            <TableSkeleton rows={5} />
          )}
        </div>
      ) : items.length === 0 && !activity.isError ? (
        <p className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
          {filtered
            ? "Tidak ada aktivitas yang cocok dengan filter."
            : "Belum ada aktivitas tercatat."}
        </p>
      ) : isMobile ? (
        <MobileCardList
          items={items}
          keyOf={(e) => e.id}
          pagination={{ total, page, pageSize: PAGE_SIZE, onChange: setPage }}
          renderCard={(e) => (
            <MobileDataCard
              header={
                <CardSummary title={<ActionPill action={e.action} />} subtitle={formatTime(e.at)} />
              }
              collapsible
              rows={[
                { label: "Target", value: <Target entry={e} /> },
                { label: "Organisasi", value: orgName(e.orgId) },
                {
                  label: "Pelaku",
                  value: <span className="font-mono text-xs">{dash(e.actorUserId)}</span>,
                },
                { label: "IP", value: dash(e.ip) },
              ]}
            />
          )}
        />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          getRowId={(e) => e.id}
          pagination={{
            total,
            current: page,
            pageSize: PAGE_SIZE,
            onChange: (next) => setPage(next),
          }}
        />
      )}
    </div>
  );
}
