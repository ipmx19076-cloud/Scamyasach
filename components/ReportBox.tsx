/** Where to report fraud. Used on the safety page and after a scam verdict. */
export function ReportBox({ title = "Lost money to a scam?" }: { title?: string }) {
  return (
    <section className="rounded-[22px] border-[3px] border-scam bg-scam-wash px-5 py-5">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">{title}</h2>
      <p className="mt-1">Act fast. The sooner you report, the better the chance of stopping the money.</p>
      <ol className="mt-4 space-y-3">
        <li>
          <a
            href="tel:1930"
            className="flex h-14 items-center justify-between rounded-2xl bg-scam px-5 font-[family-name:var(--font-display)] text-xl font-bold text-white dark:text-paper"
          >
            <span>Call 1930</span>
            <span className="font-[family-name:var(--font-body)] text-sm font-normal">Cyber crime helpline</span>
          </a>
        </li>
        <li>
          Report online at{" "}
          <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
            cybercrime.gov.in
          </a>
        </li>
        <li>Call your bank on the number on your card and ask them to block your card or UPI.</li>
      </ol>
    </section>
  );
}
