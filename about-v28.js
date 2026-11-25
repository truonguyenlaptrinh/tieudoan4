(() => {
  'use strict';

  const nav = document.querySelector('#nav');
  const view = document.querySelector('#view');
  let client;
  let seq = 0;

  const el = (tag, text) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  };

  const db = () => {
    const config = window.MEDIA_CONFIG;

    if (!config?.url || !config?.key) {
      throw Error('Chưa cấu hình media-config.js');
    }

    return client ||= supabase.createClient(
      config.url,
      config.key
    );
  };

  const check = result => {
    if (result.error) throw result.error;
    return result.data;
  };

  const load = async () => check(
    await db()
      .from('portal_about')
      .select('title,body,updated_at')
      .eq('id', 1)
      .maybeSingle()
  );

  async function show() {
    const original = [...view.childNodes];
    const ticket = seq;

    try {
      const row = await load();

      if (
        ticket !== seq ||
        original.some(n => !view.contains(n))
      ) return;

      if (!row) {
        try {
          if (
            check(await db().rpc('account_is_admin')) &&
            ticket === seq
          ) {
            const button = el(
              'button',
              'Chỉnh sửa giới thiệu'
            );
            button.onclick = edit;
            view.append(button);
          }
        } catch {}
        return;
      }

      const article = el('article');
      article.className = 'about-v27';

      const content = el('div', row.body);
      content.style.whiteSpace = 'pre-wrap';
      content.style.lineHeight = '1.8';

      article.append(
        el('h2', row.title),
        content
      );

      const button = el(
        'button',
        'Chỉnh sửa giới thiệu'
      );

      button.type = 'button';
      button.onclick = edit;

      try {
        if (
          check(await db().rpc('account_is_admin')) &&
          ticket === seq
        ) {
          article.append(button);
        }
      } catch {}

      if (ticket !== seq) return;

      view.replaceChildren(article);

    } catch (error) {
      console.warn('Giới thiệu:', error.message);
    }
  }

  async function edit() {
    const panel = el('section');
    panel.className = 'about-v27';

    const status = el('p');
    status.setAttribute('role', 'status');

    panel.append(
      el('h2', 'QUẢN TRỊ NỘI DUNG GIỚI THIỆU'),
      status
    );

    view.replaceChildren(panel);

    try {
      const c = db();

      if (!check(await c.rpc('account_is_admin'))) {
        throw Error(
          'Tài khoản chưa được cấp quyền quản trị.'
        );
      }

      const row = await load();

      const title = el('input');
      title.value = row?.title || 'GIỚI THIỆU TIỂU ĐOÀN 4';
      title.maxLength = 200;
      title.style.width = '100%';
      title.style.boxSizing = 'border-box';

      const body = el('textarea');
      body.rows = 18;
      body.maxLength = 30000;
      body.style.width = '100%';
      body.style.boxSizing = 'border-box';
      body.style.lineHeight = '1.8';

      body.value = row?.body ||
        'Tiểu đoàn 4 – Trung đoàn 8 – Sư đoàn 395.';

      const preview = el('article');

      const save = el('button', 'Lưu và công bố');
      const pre = el('button', 'Xem trước');
      const back = el('button', 'Quay lại');

      pre.onclick = () => {
        const content = el('div', body.value);
        content.style.whiteSpace = 'pre-wrap';
        content.style.lineHeight = '1.8';

        preview.replaceChildren(
          el('h2', title.value),
          content
        );
      };

      back.onclick = () => {
        const link = [...nav.querySelectorAll('button,a')]
          .find(b => b.textContent.trim() === 'Giới thiệu');

        if (link) link.click();
      };

      save.onclick = async () => {
        if (!title.value.trim() || !body.value.trim()) {
          status.textContent =
            'Vui lòng nhập đầy đủ tiêu đề và nội dung.';
          return;
        }

        if (!confirm(
          'Xác nhận nội dung được phép công bố?'
        )) return;

        save.disabled = true;

        try {
          check(
            await c.from('portal_about').upsert({
              id: 1,
              title: title.value.trim(),
              body: body.value.trim(),
              updated_at: new Date().toISOString()
            })
          );

          status.style.color = 'green';
          status.textContent =
            'Đã lưu và công bố nội dung giới thiệu thành công!';

        } catch (error) {
          status.style.color = 'red';
          status.textContent = error.message;

        } finally {
          save.disabled = false;
        }
      };

      panel.append(
        el('label', 'Tiêu đề'),
        title,
        el('label', 'Nội dung giới thiệu'),
        body,
        pre,
        save,
        back,
        preview
      );

    } catch (error) {
      status.textContent = error.message;
    }
  }

  nav.addEventListener('click', event => {
    const button = event.target.closest('button,a');
    if (!button) return;

    const token = ++seq;

    if (button.textContent.trim() === 'Giới thiệu') {
      setTimeout(() => {
        if (token === seq) show();
      }, 150);
    }
  });

  let scanId = 0;

  async function scan() {
    const id = ++scanId;

    const signed = [...nav.querySelectorAll('button,a')]
      .some(b => b.textContent.trim() === 'Đăng xuất');

    let allowed = false;

    if (signed) {
      try {
        allowed = !!check(
          await db().rpc('account_is_admin')
        );
      } catch {}
    }

    if (id !== scanId) return;

    const old = nav.querySelector('#about-admin');

    if (allowed && !old) {
      const button = el('button', 'Sửa giới thiệu');

      button.id = 'about-admin';
      button.type = 'button';
      button.onclick = edit;

      nav.append(button);

    } else if (!allowed && old) {
      old.remove();
    }
  }

  new MutationObserver(scan).observe(nav, {
    childList: true,
    subtree: true
  });

  scan();
})();
