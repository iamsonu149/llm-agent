/* globals bootstrap */
let container;
let containerPosition;

export function bootstrapAlert(options) {
  if (typeof options === "string") options = { body: options };
  let { body, title, color, replace = false, position, ...toastOptions } = options;

  if (!body) throw new Error("bootstrapAlert: body is required");
  if (typeof bootstrap == "undefined") throw new Error("bootstrapAlert: Bootstrap 5 is required");

  containerPosition = position ?? containerPosition ?? "top-0 end-0";
  // Reset container if it exists but is not in the DOM
  if (container && !document.body.contains(container)) container = null;

  // Create or reuse the container
  if (!container) {
    container = document.createElement("div");
    document.body.appendChild(container);
  }
  container.className = `toast-container position-fixed ${containerPosition} p-3`;

  // Clear container if we're replacing existing toasts
  if (replace) container.innerHTML = "";

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = title
    ? /* html */ `
      <div class="toast-header text-bg-${color ?? "primary"}">
        ${title} <button type="button" class="btn-close ms-auto" data-bs-dismiss="toast"></button>
      </div>
      <div class="toast-body">${body}</div>`
    : /* html */ `
      <div class="d-flex ${color ? `text-bg-${color}` : ""}">
        <div class="toast-body">${body}</div>
        <button type="button" class="btn-close m-auto me-2" data-bs-dismiss="toast"></button>
      </div>`;
  container.appendChild(toast);

  const bsToast = new bootstrap.Toast(toast, toastOptions);
  bsToast.show();
}
