"use client";

import {
  Download,
  Eye,
  EyeOff,
  FileUp,
  Mail,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Tag,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";

type Group = { id: string; name: string };

type Account = {
  id: string;
  email: string;
  clientId: string;
  accessTokenExpiresAt?: string | Date | null;
  syncStatus?: string | null;
  lastSyncedAt?: string | null;
  tags: { id: string; name: string }[];
  group: Group;
};

type MailItem = {
  graphId: string;
  subject: string;
  fromAddress: string;
  receivedAt: string;
  hasAttachments: boolean;
  isRead: boolean;
  mailbox?: { email: string };
};

type DetailPayload = {
  message: MailItem;
  body: { contentType: string; content: string };
};

const syncStatusLabels: Record<string, string> = {
  idle: "待同步",
  syncing: "同步中",
  ok: "正常",
  error: "异常"
};

function formatTokenExpiry(value?: string | Date | null) {
  if (!value) return "未刷新";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "未知";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function generateApiKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const payload = await response.json();
  if (!response.ok && response.status !== 207) {
    throw new Error(payload.error ?? "请求失败");
  }
  return payload;
}

export function AdminConsole({
  initialAccounts,
  initialGroups,
  initialTotalAccounts
}: {
  initialAccounts: Account[];
  initialGroups: Group[];
  initialTotalAccounts: number;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [groups, setGroups] = useState(
    initialGroups.length ? initialGroups : [{ id: "default", name: "default" }]
  );
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState("default");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("就绪");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageJump, setPageJump] = useState("1");
  const [totalAccounts, setTotalAccounts] = useState(initialTotalAccounts);
  const [allMatchingSelected, setAllMatchingSelected] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importDelimiter, setImportDelimiter] = useState("----");
  const [importGroup, setImportGroup] = useState("default");
  const [newGroup, setNewGroup] = useState("");
  const [exportDelimiter, setExportDelimiter] = useState("----");
  const [exportText, setExportText] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [mailAccount, setMailAccount] = useState<Account | null>(null);
  const [messages, setMessages] = useState<MailItem[]>([]);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [accessKey, setAccessKey] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [refreshEnabled, setRefreshEnabled] = useState(false);
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const currentPageEmails = useMemo(
    () => accounts.map((account) => account.email),
    [accounts]
  );
  const currentPageSelected =
    currentPageEmails.length > 0 &&
    currentPageEmails.every((email) => selectedEmails.includes(email));
  const selectedCount = selectedEmails.length;
  const totalPages = Math.max(1, Math.ceil(totalAccounts / pageSize));

  const groupOptions = useMemo(
    () => Array.from(new Set(groups.map((group) => group.name))),
    [groups]
  );

  async function reloadGroups() {
    const data = await requestJson<{ groups: Group[] }>("/api/groups");
    setGroups(data.groups.length ? data.groups : [{ id: "default", name: "default" }]);
  }

  async function reloadAccounts(params = { search, group: activeGroup, page }) {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.group) query.set("group", params.group);
    query.set("page", String(params.page ?? page));
    query.set("pageSize", String(pageSize));
    const data = await requestJson<{
      accounts: Account[];
      total: number;
      page: number;
      pageSize: number;
    }>(
      `/api/accounts?${query.toString()}`
    );
    setAccounts(data.accounts);
    setTotalAccounts(data.total);
    setPage(data.page);
    setPageJump(String(data.page));
    if (!allMatchingSelected) setSelectedEmails([]);
  }

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportText(await file.text());
  }

  async function importAccounts() {
    const targetGroup = (newGroup.trim() || importGroup || "default").trim();
    setImportSubmitting(true);
    const result = await requestJson<any>("/api/import", {
      method: "POST",
      body: JSON.stringify({
        text: importText,
        delimiter: importDelimiter,
        group: targetGroup
      })
    }).finally(() => setImportSubmitting(false));
    setImportOpen(false);
    setImportText("");
    setNewGroup("");
    setActiveGroup(targetGroup);
    setPage(1);
    setAllMatchingSelected(false);
    setSelectedEmails([]);
    setNotice(
      result.errors?.length
        ? `已提交后台导入：接受 ${result.accepted} 行，解析错误 ${result.errors.length} 行`
        : `已提交后台导入：接受 ${result.accepted} 行`
    );
    setTimeout(() => {
      void reloadGroups();
      void reloadAccounts({ search: "", group: targetGroup, page: 1 });
    }, 1500);
  }

  async function exportAccounts() {
    const data = await requestJson<{ text: string }>("/api/export", {
      method: "POST",
      body: JSON.stringify({
        emails: selectedEmails,
        delimiter: exportDelimiter
      })
    });
    setExportText(data.text);
    setNotice(`已导出 ${selectedEmails.length} 个账号`);
  }

  async function applyTags(action: "add" | "remove") {
    if (!selectedEmails.length || !tagInput.trim()) return;
    await requestJson("/api/tags", {
      method: "POST",
      body: JSON.stringify({
        emails: selectedEmails,
        tags: tagInput.split(",").map((tag) => tag.trim()).filter(Boolean),
        action
      })
    });
    setNotice(action === "add" ? "标签已添加" : "标签已移除");
    setTagOpen(false);
    setTagInput("");
    await reloadAccounts({ search, group: activeGroup, page });
  }

  async function deleteSelected(emails = selectedEmails) {
    if (!emails.length) return;
    await requestJson("/api/accounts/delete", {
      method: "POST",
      body: JSON.stringify({ emails })
    });
    setNotice(`已删除 ${emails.length} 个账号`);
    setAllMatchingSelected(false);
    await reloadAccounts({ search, group: activeGroup, page });
  }

  async function syncAccount(account: Account) {
    setNotice(`正在同步 ${account.email}`);
    await requestJson("/api/sync", {
      method: "POST",
      body: JSON.stringify({ accountId: account.id })
    });
    setNotice(`${account.email} 已同步`);
    await reloadAccounts({ search, group: activeGroup, page });
  }

  async function syncSelectedAccounts() {
    if (!selectedEmails.length) return;
    const selectedCount = selectedEmails.length;
    setNotice(`正在提交 ${selectedCount} 个账号的后台同步任务`);
    await requestJson("/api/sync", {
      method: "POST",
      body: JSON.stringify({ accountEmails: selectedEmails })
    });
    setNotice(`已提交后台同步 ${selectedCount} 个账号`);
    setTimeout(() => {
      void reloadAccounts({ search, group: activeGroup, page });
    }, 1500);
  }

  async function openMail(account: Account) {
    setMailAccount(account);
    setMailOpen(true);
    setDetail(null);
    const query = new URLSearchParams({ account: account.email });
    const data = await requestJson<{ emails: MailItem[] }>(
      `/api/v1/emails?${query.toString()}`
    );
    setMessages(data.emails);
  }

  async function openDetail(message: MailItem) {
    const account = mailAccount?.email;
    if (!account) return;
    const data = await requestJson<{ email: DetailPayload }>(
      `/api/v1/email/detail?account=${encodeURIComponent(account)}&mail_id=${encodeURIComponent(message.graphId)}`
    );
    setDetail(data.email);
  }

  function toggleSelected(email: string) {
    setSelectedEmails((current) =>
      current.includes(email)
        ? current.filter((item) => item !== email)
        : [...current, email]
    );
  }

  function toggleCurrentPage() {
    setAllMatchingSelected(false);
    setSelectedEmails((current) => {
      if (currentPageSelected) {
        return current.filter((email) => !currentPageEmails.includes(email));
      }
      return Array.from(new Set([...current, ...currentPageEmails]));
    });
  }

  async function selectAllMatching() {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (activeGroup) query.set("group", activeGroup);
    query.set("selectAll", "true");
    const data = await requestJson<{ emails: string[] }>(
      `/api/accounts?${query.toString()}`
    );
    setSelectedEmails(data.emails);
    setAllMatchingSelected(true);
    setNotice(`已选择全部匹配账号：${data.emails.length} 个`);
  }

  function clearSelection() {
    setSelectedEmails([]);
    setAllMatchingSelected(false);
  }

  async function changeGroup(group: string) {
    setActiveGroup(group);
    setPage(1);
    setSelectedEmails([]);
    setAllMatchingSelected(false);
    await reloadAccounts({ search, group, page: 1 });
  }

  async function changePage(nextPage: number) {
    const bounded = Math.min(totalPages, Math.max(1, nextPage));
    await reloadAccounts({ search, group: activeGroup, page: bounded });
  }

  async function changePageSize(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
    setPageJump("1");
    setSelectedEmails([]);
    setAllMatchingSelected(false);

    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (activeGroup) query.set("group", activeGroup);
    query.set("page", "1");
    query.set("pageSize", String(nextPageSize));
    const data = await requestJson<{
      accounts: Account[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/api/accounts?${query.toString()}`);
    setAccounts(data.accounts);
    setTotalAccounts(data.total);
    setPage(data.page);
    setPageJump(String(data.page));
  }

  function submitPageJump() {
    const target = Number(pageJump);
    if (!Number.isFinite(target)) {
      setPageJump(String(page));
      return;
    }
    void changePage(target);
  }

  async function openSettings() {
    const data = await requestJson<{
      settings: { accessKey: string; apiKey: string; refreshEnabled: boolean };
    }>("/api/settings");
    setAccessKey(data.settings.accessKey);
    setApiKey(data.settings.apiKey);
    setRefreshEnabled(data.settings.refreshEnabled);
    setShowAccessKey(false);
    setShowApiKey(false);
    setSettingsOpen(true);
  }

  async function saveSettings() {
    const data = await requestJson<{
      settings: { accessKey: string; apiKey: string; refreshEnabled: boolean };
    }>("/api/settings", {
      method: "POST",
      body: JSON.stringify({ accessKey, apiKey, refreshEnabled })
    });
    setAccessKey(data.settings.accessKey);
    setApiKey(data.settings.apiKey);
    setRefreshEnabled(data.settings.refreshEnabled);
    setSettingsOpen(false);
    setNotice("系统设置已保存");
  }

  return (
    <main className="min-h-screen bg-[#f6f8f6] text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-action">
              ByteOryx
            </p>
            <h1 className="mt-1 text-2xl font-semibold">邮箱管理器</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeGroup}
              onChange={(event) => changeGroup(event.target.value)}
              className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-action"
            >
              {groupOptions.map((group) => (
                <option key={group} value={group}>
                  分组：{group}
                </option>
              ))}
            </select>
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-action px-3 text-sm font-medium text-white"
            >
              <Upload className="h-4 w-4" />
              导入
            </button>
            <button
              onClick={() => setExportOpen(true)}
              disabled={!selectedCount}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              导出
            </button>
            <button
              onClick={openSettings}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-medium"
              aria-label="系统设置"
            >
              <Settings className="h-4 w-4" />
              设置
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-md border border-line bg-white px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") reloadAccounts();
              }}
              placeholder="搜索邮箱账号"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPage(1);
                void reloadAccounts({ search, group: activeGroup, page: 1 });
              }}
              className="h-10 rounded-md border border-line bg-white px-3 text-sm font-medium"
            >
              筛选
            </button>
            <button
              onClick={syncSelectedAccounts}
              disabled={!selectedCount}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCcw className="h-4 w-4" />
              一键同步
            </button>
            <button
              onClick={() => setTagOpen(true)}
              disabled={!selectedCount}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Tag className="h-4 w-4" />
              添加标签
            </button>
            <button
              onClick={() => deleteSelected()}
              disabled={!selectedCount}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-danger/30 bg-white px-3 text-sm font-medium text-danger disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              删除
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="grid grid-cols-[44px_minmax(220px,1.35fr)_minmax(100px,0.55fr)_minmax(140px,0.8fr)_120px_170px_260px] items-center border-b border-line bg-mist/60 px-4 py-3 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={currentPageSelected}
              onChange={toggleCurrentPage}
              aria-label="选择当前页账号"
              className="h-4 w-4"
            />
            <span>邮箱账号</span>
            <span>分组</span>
            <span>标签</span>
            <span>状态</span>
            <span>Access Token 过期</span>
            <span className="text-right">操作</span>
          </div>
          <div className="max-h-[calc(100vh-220px)] overflow-auto">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="grid grid-cols-[44px_minmax(220px,1.35fr)_minmax(100px,0.55fr)_minmax(140px,0.8fr)_120px_170px_260px] items-center border-b border-line px-4 py-3 text-sm last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selectedEmails.includes(account.email)}
                  onChange={() => toggleSelected(account.email)}
                  aria-label={`选择 ${account.email}`}
                  className="h-4 w-4"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{account.email}</p>
                  <p className="truncate text-xs text-slate-500">{account.clientId}</p>
                </div>
                <span className="truncate text-slate-600">{account.group?.name ?? "default"}</span>
                <div className="flex flex-wrap gap-1">
                  {account.tags.length ? (
                    account.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded bg-action/10 px-2 py-0.5 text-xs text-action"
                      >
                        {tag.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">无标签</span>
                  )}
                </div>
                <span className="w-fit rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {syncStatusLabels[account.syncStatus ?? "idle"] ?? account.syncStatus}
                </span>
                <span className="truncate text-xs text-slate-600">
                  {formatTokenExpiry(account.accessTokenExpiresAt)}
                </span>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setSelectedEmails([account.email]);
                      setTagOpen(true);
                    }}
                    className="rounded-md border border-line px-2 py-1 text-xs"
                  >
                    标签
                  </button>
                  <button
                    onClick={() => syncAccount(account)}
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    同步
                  </button>
                  <button
                    onClick={() => openMail(account)}
                    className="inline-flex items-center gap-1 rounded-md border border-action px-2 py-1 text-xs text-action"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    查看邮件
                  </button>
                  <button
                    onClick={() => deleteSelected([account.email])}
                    className="rounded-md border border-danger/30 px-2 py-1 text-xs text-danger"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-500">
                当前分组暂无账号，请点击顶部“导入”添加邮箱。
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              已选择 {selectedCount} 个账号
              {allMatchingSelected ? "（全部匹配）" : ""} · 共 {totalAccounts} 个
              · 第 {page}/{totalPages} 页 · {notice}
            </span>
            <button
              onClick={selectAllMatching}
              disabled={totalAccounts === 0 || allMatchingSelected}
              className="rounded border border-line bg-white px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              选择全部匹配
            </button>
            <button
              onClick={clearSelection}
              disabled={!selectedCount}
              className="rounded border border-line bg-white px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              清空选择
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="flex items-center gap-1">
              <span>每页</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  void changePageSize(Number(event.target.value));
                }}
                className="h-8 rounded border border-line bg-white px-2 outline-none focus:border-action"
                aria-label="每页显示条数"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} 条
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => changePage(page - 1)}
              disabled={page <= 1}
              className="rounded border border-line bg-white px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              上一页
            </button>
            <label className="flex items-center gap-1">
              <span>跳至</span>
              <input
                value={pageJump}
                onChange={(event) => setPageJump(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitPageJump();
                }}
                className="h-8 w-16 rounded border border-line bg-white px-2 text-center outline-none focus:border-action"
                inputMode="numeric"
                aria-label="跳转页码"
              />
              <span>页</span>
            </label>
            <button
              onClick={submitPageJump}
              disabled={totalPages <= 1}
              className="rounded border border-line bg-white px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              跳转
            </button>
            <button
              onClick={() => changePage(page + 1)}
              disabled={page >= totalPages}
              className="rounded border border-line bg-white px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </section>

      {importOpen && (
        <Modal title="导入邮箱账号" onClose={() => setImportOpen(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">导入到分组</span>
                <select
                  value={importGroup}
                  onChange={(event) => setImportGroup(event.target.value)}
                  className="h-10 w-full rounded-md border border-line px-3 outline-none focus:border-action"
                >
                  {groupOptions.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">新建分组</span>
                <input
                  value={newGroup}
                  onChange={(event) => setNewGroup(event.target.value)}
                  placeholder="留空则使用左侧分组"
                  className="h-10 w-full rounded-md border border-line px-3 outline-none focus:border-action"
                />
              </label>
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">上传 txt 文件</span>
                <input
                  type="file"
                  accept=".txt,text/plain"
                  onChange={readFile}
                  className="block w-full rounded-md border border-line px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">分隔符</span>
                <input
                  value={importDelimiter}
                  onChange={(event) => setImportDelimiter(event.target.value)}
                  className="h-10 w-full rounded-md border border-line px-3 outline-none focus:border-action"
                />
              </label>
            </div>
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="email----password----clientId----refreshToken"
              className="h-56 w-full resize-none rounded-md border border-line bg-mist/40 p-3 text-sm outline-none focus:border-action"
            />
            <button
              onClick={importAccounts}
              disabled={importSubmitting}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-action px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileUp className="h-4 w-4" />
              {importSubmitting ? "提交中..." : "开始导入"}
            </button>
          </div>
        </Modal>
      )}

      {exportOpen && (
        <Modal title="导出邮箱账号" onClose={() => setExportOpen(false)}>
          <div className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="text-slate-600">导出分隔符</span>
              <input
                value={exportDelimiter}
                onChange={(event) => setExportDelimiter(event.target.value)}
                className="h-10 w-40 rounded-md border border-line px-3 outline-none focus:border-action"
              />
            </label>
            <button
              onClick={exportAccounts}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-action px-4 text-sm font-medium text-white"
            >
              <Download className="h-4 w-4" />
              生成导出内容
            </button>
            <textarea
              value={exportText}
              readOnly
              placeholder="导出内容将在这里显示"
              className="h-56 w-full resize-none rounded-md border border-line bg-mist/40 p-3 text-sm outline-none"
            />
          </div>
        </Modal>
      )}

      {tagOpen && (
        <Modal title="邮箱标签" onClose={() => setTagOpen(false)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">将对 {selectedCount} 个账号执行操作。</p>
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              placeholder="业务A, 待处理"
              className="h-10 w-full rounded-md border border-line px-3 outline-none focus:border-action"
            />
            <div className="flex gap-2">
              <button
                onClick={() => applyTags("add")}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-action px-4 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" />
                添加标签
              </button>
              <button
                onClick={() => applyTags("remove")}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-4 text-sm font-medium"
              >
                <Trash2 className="h-4 w-4" />
                移除标签
              </button>
            </div>
          </div>
        </Modal>
      )}

      {settingsOpen && (
        <Modal title="系统设置" onClose={() => setSettingsOpen(false)}>
          <div className="space-y-4">
            <label className="flex items-start gap-3 rounded-md border border-line bg-mist/35 p-3 text-sm">
              <input
                type="checkbox"
                checked={refreshEnabled}
                onChange={(event) => setRefreshEnabled(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block font-medium">开启定时刷新 Access Token</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  开启后会立即刷新一次 Access Token；后续按 Access Token 过期时间提前 10 分钟自动刷新。若微软返回新的 Refresh Token，系统会自动保存。
                </span>
              </span>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-slate-600">Access Key</span>
              <div className="flex h-10 items-center rounded-md border border-line bg-white focus-within:border-action">
                <input
                  value={accessKey}
                  onChange={(event) => setAccessKey(event.target.value)}
                  placeholder="留空则暂不启用登录密钥"
                  type={showAccessKey ? "text" : "password"}
                  className="h-full min-w-0 flex-1 rounded-md bg-transparent px-3 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowAccessKey((current) => !current)}
                  className="flex h-full w-10 items-center justify-center text-slate-500 hover:text-ink"
                  aria-label={showAccessKey ? "隐藏 Access Key" : "显示 Access Key"}
                  title={showAccessKey ? "隐藏 Access Key" : "显示 Access Key"}
                >
                  {showAccessKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-slate-600">API Key</span>
              <div className="flex h-10 items-center rounded-md border border-line bg-white focus-within:border-action">
                <input
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="用于外部 API 调用"
                  type={showApiKey ? "text" : "password"}
                  className="h-full min-w-0 flex-1 rounded-md bg-transparent px-3 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((current) => !current)}
                  className="flex h-full w-10 items-center justify-center text-slate-500 hover:text-ink"
                  aria-label={showApiKey ? "隐藏 API Key" : "显示 API Key"}
                  title={showApiKey ? "隐藏 API Key" : "显示 API Key"}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setApiKey(generateApiKey());
                  setShowApiKey(true);
                }}
                className="mt-2 inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-xs font-medium text-slate-700 hover:bg-mist"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                随机生成 API Key
              </button>
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSettingsOpen(false)}
                className="h-10 rounded-md border border-line px-4 text-sm font-medium"
              >
                取消
              </button>
              <button
                onClick={saveSettings}
                className="h-10 rounded-md bg-action px-4 text-sm font-medium text-white"
              >
                保存设置
              </button>
            </div>
          </div>
        </Modal>
      )}

      {mailOpen && (
        <Modal title={`查看邮件：${mailAccount?.email ?? ""}`} wide onClose={() => setMailOpen(false)}>
          <div className="grid min-h-[520px] grid-cols-[320px_1fr] overflow-hidden rounded-md border border-line">
            <div className="border-r border-line bg-mist/35">
              <div className="border-b border-line p-3 text-sm font-medium">邮件列表</div>
              <div className="max-h-[520px] overflow-auto">
                {messages.map((message) => (
                  <button
                    key={message.graphId}
                    onClick={() => openDetail(message)}
                    className="w-full border-b border-line bg-white px-3 py-3 text-left hover:bg-mist/70"
                  >
                    <p className="truncate text-sm font-medium">
                      {message.subject || "（无主题）"}
                    </p>
                    <p className="truncate text-xs text-slate-500">{message.fromAddress}</p>
                  </button>
                ))}
                {messages.length === 0 && (
                  <div className="p-6 text-sm text-slate-500">暂无邮件，请先同步账号。</div>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <div className="border-b border-line p-3 text-sm font-medium">邮件详情</div>
              <div
                className="max-h-[520px] overflow-auto p-4 text-sm leading-6"
                dangerouslySetInnerHTML={{
                  __html:
                    detail?.body.content ??
                    "<span style='color:#64748b'>请选择左侧邮件。</span>"
                }}
              />
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}

function Modal({
  title,
  children,
  wide,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
      <section
        className={`max-h-[90vh] overflow-auto rounded-lg bg-white shadow-xl ${
          wide ? "w-full max-w-6xl" : "w-full max-w-2xl"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md border border-line p-2"
            aria-label="关闭弹窗"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}
