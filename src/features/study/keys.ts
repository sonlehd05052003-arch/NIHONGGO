/** Đang focus vào nút / ô nhập → để Enter/Space cho phần tử đó xử lý, không chạy phím tắt */
export const isFromControl = (e: KeyboardEvent) =>
  e.target instanceof HTMLElement && !!e.target.closest('button, a, input, textarea, select, [role="button"]')
