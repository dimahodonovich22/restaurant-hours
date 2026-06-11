export type Worker = {
  id: string;
  name: string;
  // Сохраняется для подстановки ставки по умолчанию в новую смену.
  hourly?: number;
};

export type Entry = {
  id: string;
  workerId: string;
  date: string;     // YYYY-MM-DD
  comment?: string; // необязательный тег смены: зал / кухня / бар…
  start: string;    // HH:mm
  end: string;      // HH:mm
  lunch: boolean;   // true → вычесть 30 мин
  hourly?: number;  // €/ч за эту смену
  multiplier?: number; // 1 | 1.5 | 2 — коэффициент для часов (ночь/праздники)
  // Дополнительные отрезки времени в тот же день (разрыв смены: утро + вечер).
  // Часы суммируются с основным сегментом, обед вычитается один раз за день.
  extraSegments?: Segment[];
};

export type Segment = {
  start: string;
  end: string;
};

export type Note = {
  id: string;
  workerId: string;
  date: string;          // YYYY-MM-DD
  direction: 'minus' | 'plus'; // minus = я должен начальнику, plus = начальник должен мне
  amount: number;        // евро
  description: string;
  photos?: string[];     // data URL'ы (JPEG, сжатые)
};

export type AppState = {
  workers: Worker[];
  entries: Entry[];
  notes: Note[];
  // Ставка для общей плашки на главном экране (независима от ставок в сменах).
  overviewRates?: {
    hourly: number;
  };
};
