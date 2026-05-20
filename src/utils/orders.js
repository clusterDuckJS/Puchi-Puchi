export const ORDER_STAGE_OPTIONS = [
  { value: "paid", label: "Order Locked In" },
  { value: "magic_modelling", label: "Magic Modelling" },
  { value: "printing", label: "Printing" },
  { value: "curing_chamber", label: "Curing" },
  { value: "paint_studio", label: "Paint Studio" },
  { value: "final_touches", label: "Final Touches" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
];

export const ORDER_STAGE_INDEX = ORDER_STAGE_OPTIONS.reduce((map, stage, index) => ({
  ...map,
  [stage.value]: index,
}), {
  confirmed: 0,
  modeling: 1,
  "magic modelling": 1,
  curing: 3,
  curing_chamber: 3,
  painting: 4,
  "paint studio": 4,
  finishing: 5,
  ready: 6,
  ready_to_ship: 6,
  shipped: 6,
});

export const normalizeOrderStatus = (status) => String(status || "paid").trim().toLowerCase();

export const getOrderStageIndex = (status) => ORDER_STAGE_INDEX[normalizeOrderStatus(status)] ?? 0;

export const formatOrderStatus = (status) => {
  const normalizedStatus = normalizeOrderStatus(status);
  const option = ORDER_STAGE_OPTIONS.find((item) => item.value === normalizedStatus);

  if (option) return option.label;

  return normalizedStatus
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const formatOrderNumber = (order) => {
  if (order?.order_number) {
    return String(order.order_number).padStart(4, "0");
  }

  return String(order?.id || "").slice(0, 8).toUpperCase();
};

const isWorkingDay = (date) => {
  const day = date.getDay();
  return day !== 0 && day !== 6;
};

export const addWorkingDays = (value, workingDays = 5) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const dueDate = new Date(date);
  let addedDays = 0;

  while (addedDays < workingDays) {
    dueDate.setDate(dueDate.getDate() + 1);

    if (isWorkingDay(dueDate)) {
      addedDays += 1;
    }
  }

  return dueDate;
};

export const getOrderPlacedAt = (order) => (
  order?.paid_at ||
  order?.placed_at ||
  order?.created_at ||
  null
);

export const getOrderDueDate = (order) => addWorkingDays(getOrderPlacedAt(order), 5);

export const getWorkingDaysRemaining = (order, nowValue = new Date()) => {
  const dueDate = getOrderDueDate(order);

  if (!dueDate) return null;

  const today = new Date(nowValue);
  today.setHours(0, 0, 0, 0);

  const end = new Date(dueDate);
  end.setHours(0, 0, 0, 0);

  if (today > end) return 0;

  let remaining = 0;
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor <= end) {
    if (isWorkingDay(cursor)) {
      remaining += 1;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return remaining;
};

export const formatShortDate = (value) => {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

export const getCountdownLabel = (order) => {
  const status = normalizeOrderStatus(order?.status);
  const dueDate = getOrderDueDate(order);

  if (!dueDate) return "Production timeline pending";
  if (status === "delivered") return "Delivered";

  const remaining = getWorkingDaysRemaining(order);
  const dueLabel = formatShortDate(dueDate);

  if (status === "dispatched" || status === "shipped" || status === "ready_to_ship") {
    return `Dispatched. Estimated production due date was ${dueLabel}`;
  }

  if (remaining === 0) {
    return `Production due by ${dueLabel}`;
  }

  return `${remaining} working day${remaining === 1 ? "" : "s"} left. Due by ${dueLabel}`;
};
