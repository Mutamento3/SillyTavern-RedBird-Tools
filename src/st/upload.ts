/**
 * 导入角色卡时显示上传了多少。
 * 酒馆用 fetch 上传卡文件，fetch 拿不到上传进度。手机远程连接时，一张几 MB 的卡要传十几秒，
 * 这段时间酒馆什么都不显示，看着像没反应。这里把这一个请求换成 XMLHttpRequest（同样的地址、
 * 请求头和内容），用一条通知显示传了多少。酒馆的导入按钮和工具箱的「导入文件」都走这个请求。
 */
const IMPORT = /\/api\/characters\/import(?:[?#]|$)/;
/** 很快传完的（电脑上、文件小）不弹通知，免得一闪而过 */
const SHOW_AFTER = 600;

export function installUploadProgress(): void {
  if (typeof XMLHttpRequest === 'undefined') return;
  const orig = window.fetch;
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : '';
    if (!IMPORT.test(url) || !(init?.body instanceof FormData)) return orig.call(window, input, init);
    return uploadWithProgress(url, init as RequestInit & { body: FormData });
  }) as typeof fetch;
}

function uploadWithProgress(url: string, init: RequestInit & { body: FormData }): Promise<Response> {
  const note = progressNote();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(init.method ?? 'POST', url);
    new Headers(init.headers).forEach((v, k) => xhr.setRequestHeader(k, v));
    xhr.responseType = 'blob';
    xhr.upload.onprogress = (e) => note.show(e.loaded, e.lengthComputable ? e.total : 0);
    xhr.upload.onload = () => note.uploaded();
    xhr.onload = () => {
      note.close();
      const headers = new Headers();
      for (const line of xhr.getAllResponseHeaders().trim().split(/\r?\n/)) {
        const i = line.indexOf(':');
        if (i > 0) headers.append(line.slice(0, i).trim(), line.slice(i + 1).trim());
      }
      resolve(new Response([204, 205, 304].includes(xhr.status) ? null : xhr.response, { status: xhr.status, statusText: xhr.statusText, headers }));
    };
    xhr.onerror = xhr.onabort = () => { note.close(); reject(new TypeError('Failed to fetch')); };
    xhr.send(init.body);
  });
}

const mb = (n: number) => (n / 1048576).toFixed(1);

function progressNote() {
  let el: { 0?: HTMLElement } | null = null;
  let text = '';
  let pct = 0;
  const draw = () => {
    const box = el?.[0];
    if (!box) return;
    box.querySelector('.rbt-up-text')!.textContent = text;
    box.querySelector<HTMLElement>('.rbt-up-fill')!.style.width = `${pct}%`;
  };
  const timer = setTimeout(() => {
    el = window.toastr?.info('<span class="rbt-up-text"></span><span class="rbt-up-bar"><i class="rbt-up-fill"></i></span>', '导入角色卡', {
      timeOut: 0, extendedTimeOut: 0, tapToDismiss: false, closeButton: true, escapeHtml: false, toastClass: 'toast rbt-up',
    }) ?? null;
    draw();
  }, SHOW_AFTER);
  return {
    show(sent: number, total: number) {
      text = total ? `正在上传 ${mb(sent)} / ${mb(total)} MB` : '正在上传…';
      pct = total ? Math.round((sent / total) * 100) : 0;
      draw();
    },
    uploaded() { text = '已上传，正在导入…'; pct = 100; draw(); },
    close() { clearTimeout(timer); if (el) window.toastr?.clear(el, { force: true }); },
  };
}
