import { cookies } from "next/headers";
import { AccessKeyLogin } from "@/components/access-key-login";
import { AdminConsole } from "@/components/admin-console";
import { ACCESS_COOKIE, createAccessSessionValue } from "@/lib/access-session";
import type { AccountShape } from "@/lib/mailbox-service";
import { getMailboxService, getSettingsService } from "@/server/services";

export const dynamic = "force-dynamic";

export default async function Home() {
  let accounts: AccountShape[] = [];
  let groups: { id: string; name: string }[] = [];
  let accessRequired = false;

  try {
    const settings = await getSettingsService().getSettings();
    accessRequired = Boolean(settings.accessKey);
    const cookieStore = await cookies();
    if (
      accessRequired &&
      cookieStore.get(ACCESS_COOKIE)?.value !==
        createAccessSessionValue(settings.accessKey)
    ) {
      return <AccessKeyLogin />;
    }

    const mailboxService = getMailboxService();
    accounts = await mailboxService.listAccounts({ group: "default" });
    groups = await mailboxService.listGroups();
  } catch {
    accounts = [];
    groups = [{ id: "default", name: "default" }];
  }

  return <AdminConsole initialAccounts={accounts} initialGroups={groups} />;
}
