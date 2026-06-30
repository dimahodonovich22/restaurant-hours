import { useEffect } from 'react';
import type { Entry, Worker } from '../types';
import {
  ddmm,
  entryHours,
  entryMonthKey,
  entryPay,
  formatMonthLabel,
  formatNum,
  monthTotal,
} from '../calc';

type Props = {
  worker: Worker;
  entries: Entry[];
  monthKey: string;
  onBack: () => void;
};

export function ReportView({ worker, entries, monthKey, onBack }: Props) {
  const visible = entries
    .filter((e) => e.workerId === worker.id && entryMonthKey(e.date) === monthKey)
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const total = monthTotal(entries, worker, monthKey);

  useEffect(() => {
    document.title = `Звіт ${worker.name} — ${formatMonthLabel(monthKey)}`;
    return () => {
      document.title = 'Облік ресторан';
    };
  }, [worker.name, monthKey]);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="report-screen">
      <header className="topbar no-print">
        <button className="link" onClick={onBack}>‹ Назад</button>
        <h1>Звіт</h1>
        <button className="link" onClick={handlePrint}>Друк</button>
      </header>

      <div className="report-hint no-print">
        Натисніть «Друк», потім у діалозі Safari виберіть <strong>«Зберегти у Файли»</strong> або
        надішліть PDF напряму через AirDrop / Telegram / пошту.
      </div>

      <article className="report">
        <div className="report-header">
          <div>
            <h1 className="report-title">Звіт про роботу</h1>
            <div className="report-period">{formatMonthLabel(monthKey)}</div>
          </div>
          <div className="report-worker">
            <div className="report-worker-label">Співробітник</div>
            <div className="report-worker-name">{worker.name}</div>
          </div>
        </div>

        <table className="report-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Ділянка</th>
              <th>Час</th>
              <th className="num">Години</th>
              <th className="num">Сума €</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => {
              const h = entryHours(e);
              const sum = entryPay(e, worker);
              const times = [
                `${e.start}–${e.end}`,
                ...(e.extraSegments?.map((s) => `${s.start}–${s.end}`) ?? []),
              ].join(' · ');
              return (
                <tr key={e.id}>
                  <td className="nowrap">{ddmm(e.date)}</td>
                  <td>{e.comment ?? ''}</td>
                  <td className="nowrap">{times}</td>
                  <td className="num">{formatNum(h)}</td>
                  <td className="num">{formatNum(sum)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>РАЗОМ</td>
              <td className="num">{formatNum(total.hours)}</td>
              <td className="num">{formatNum(total.pay)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="report-summary">
          <div className="summary-block">
            <div className="summary-label">Усього годин</div>
            <div className="summary-value">{formatNum(total.hours)}</div>
          </div>
          <div className="summary-block accent">
            <div className="summary-label">До виплати</div>
            <div className="summary-value">€{formatNum(total.pay)}</div>
          </div>
        </div>

        <div className="report-footer">
          Сформовано {new Date().toLocaleDateString('uk-UA')}
        </div>
      </article>

      <div className="footer-actions no-print">
        <button className="primary" onClick={handlePrint}>Зберегти як PDF</button>
      </div>
    </div>
  );
}
