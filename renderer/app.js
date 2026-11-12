/* Agency Dashboard – renderer */
'use strict';

// ---------- Helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 9);

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

function hueFrom(str) {
  let n = 0;
  for (const ch of str) n = (n * 31 + ch.charCodeAt(0)) % 360;
  return n;
}
const colorFor = (str) => `hsl(${hueFrom(str)} 55% 48%)`;

// Icone di marca per gli strumenti riconosciuti (al posto del badge con iniziale)
const BRAND_ICONS = [
  {
    keys: ['cloudflare'],
    bg: '#F38020',
    svg: '<svg viewBox="0 0 640 512" width="16" height="13" fill="#fff"><path d="M407.9 319.9L177.1 317c-.7 0-1.4-.2-2-.5s-1.2-.8-1.6-1.4c-.4-.6-.7-1.3-.7-2s0-1.4 .2-2.1c.4-1.1 1.1-2.1 2.1-2.8s2.1-1.2 3.3-1.2l232.9-2.9c27.6-1.3 57.5-23.6 68-50.8l13.3-34.5c.4-.9 .5-1.9 .5-2.9 0-.5-.1-1.1-.2-1.6-7.4-32.2-25-61.1-50.3-82.3s-56.7-33.7-89.7-35.5-65.6 7.3-93 25.7-48 45.3-58.8 76.5c-11.3-8.5-24.9-13.3-39-13.7s-28 3.5-39.8 11.4-20.8 19.1-25.9 32.3-5.9 27.6-2.4 41.3c-52.3 1.5-94.2 44.1-94.2 96.5 0 4.7 .3 9.3 1 14 .2 1.1 .7 2.1 1.5 2.8s1.9 1.1 2.9 1.1l426.1 .1c0 0 .1 0 .1 0 1.2 0 2.3-.4 3.3-1.1s1.6-1.7 2-2.9l3.3-11.3c3.9-13.4 2.4-25.8-4.1-34.9-6-8.4-16.1-13.3-28.2-13.9zm105.9-98.8c-2.1 0-4.3 .1-6.4 .2-.8 .1-1.5 .3-2.1 .8s-1 1.1-1.3 1.8l-9.1 31.2c-3.9 13.4-2.4 25.8 4.1 34.9 6 8.4 16.1 13.3 28.2 13.9l49.2 2.9c.7 0 1.4 .2 2 .5s1.1 .8 1.5 1.4c.4 .6 .7 1.3 .8 2s0 1.5-.2 2.1c-.4 1.1-1.1 2.1-2.1 2.8s-2.1 1.2-3.3 1.2l-51.1 2.9c-27.8 1.3-57.7 23.6-68.1 50.8l-3.7 9.6c-.2 .4-.2 .8-.2 1.3s.2 .8 .4 1.2 .6 .7 .9 .9 .8 .3 1.2 .3c0 0 .1 0 .1 0l175.9 0c1 0 2-.3 2.8-.9s1.4-1.5 1.7-2.4c3.1-11.1 4.7-22.5 4.7-34 0-69.3-56.5-125.5-126.1-125.5z"/></svg>',
  },
  {
    keys: ['github'],
    bg: '#181717',
    svg: '<svg viewBox="0 0 512 512" width="16" height="16" fill="#fff"><path d="M173.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3 .3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5 .3-6.2 2.3zm44.2-1.7c-2.9 .7-4.9 2.6-4.6 4.9 .3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM252.8 8c-138.7 0-244.8 105.3-244.8 244 0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1 100-33.2 167.8-128.1 167.8-239 0-138.7-112.5-244-251.2-244zM105.2 352.9c-1.3 1-1 3.3 .7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3 .3 2.9 2.3 3.9 1.6 1 3.6 .7 4.3-.7 .7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3 .7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3 .7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9s4.3 3.3 5.6 2.3c1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"/></svg>',
  },
  {
    keys: ['google drive'],
    bg: '#2684FC',
    svg: '<svg viewBox="0 0 512 512" width="16" height="16" fill="#fff"><path d="M339 314.9L175.4 32 336.6 32 500.2 314.9 339 314.9zM201.5 338.5l-80.6 141.5 310.5 0 80.6-141.5-310.5 0zM154.1 67.4L0 338.5 80.6 480 237 208.8 154.1 67.4z"/></svg>',
  },
  {
    keys: ['hubspot'],
    bg: '#FF7A59',
    svg: '<svg viewBox="0 0 448 512" width="15" height="17" fill="#fff"><path d="M235.8 211.6c-25.1 23.7-40.8 57.3-40.8 94.6 0 29.3 9.7 56.3 26 78L171.5 434c-4.4-1.6-9.1-2.5-14-2.5-10.8 0-20.9 4.2-28.5 11.8s-11.8 17.8-11.8 28.6 4.2 20.9 11.8 28.5 17.8 11.6 28.5 11.6c10.8 0 20.9-3.9 28.6-11.6 7.6-7.6 11.8-17.8 11.8-28.5 0-4.2-.6-8.2-1.9-12.1l50-50.2c22 16.9 49.4 26.9 79.3 26.9 71.9 0 130-58.3 130-130.2 0-65.2-47.7-119.2-110.2-128.7l0-61.6c17.5-7.4 28.2-23.8 28.2-42.9 0-26.1-20.9-47.9-47-47.9S279.6 47 279.6 73.1c0 19.1 10.7 35.5 28.2 42.9l0 61.2c-15.2 2.1-29.6 6.7-42.7 13.6-27.6-20.9-117.5-85.7-168.9-124.8 1.2-4.4 2-9 2-13.8 0-28.8-23.5-52.2-52.4-52.2-28.8 0-52.2 23.4-52.2 52.2 0 28.9 23.4 52.3 52.2 52.3 9.8 0 18.9-2.9 26.8-7.6L235.8 211.6zm89.5 25.6a69 69 0 1 1 0 138 69 69 0 1 1 0-138z"/></svg>',
  },
  {
    keys: ['meta business', 'meta for developers', 'facebook'],
    bg: '#0866FF',
    svg: '<svg viewBox="0 0 640 512" width="18" height="14" fill="#fff"><path d="M640 317.9c0 91.3-39.4 148.5-110.3 148.5-62.6 0-95.8-34.6-156.9-136.6l-31.4-52.6c-8.3-12.5-14.5-24.2-21.2-35-20.1 33.8-47.1 83-47.1 83-67 116.6-104.6 141.2-156.9 141.2-72.8 0-116.2-57.3-116.2-145.9 0-143 79.8-278.1 183.9-278.1 50.2 0 93.8 24.7 144.8 89.5 37.1-50.1 78.1-89.5 130.6-89.5 99.1 0 180.7 125.7 180.7 275.5zM287.4 192.2c-42.9-62.1-70.9-80.5-104.4-80.5-61.9 0-113.8 106.1-113.8 210 0 48.5 18.5 75.7 49.6 75.7 30.2 0 49-19 103.2-103.8 0 0 24.7-39.1 65.4-101.4zM531.2 397.4c32.2 0 46.9-27.5 46.9-74.9 0-124.2-54.3-225.4-123.2-225.4-33.2 0-61.1 25.9-94.9 78 9.4 13.8 19.1 29 29.3 45.4l37.5 62.4c58.7 94.1 73.5 114.5 104.4 114.5z"/></svg>',
  },
  {
    keys: ['wordpress'],
    bg: '#21759B',
    svg: '<svg viewBox="0 0 512 512" width="16" height="16" fill="#fff"><path d="M256 8a248 248 0 1 0 0 496 248 248 0 1 0 0-496zM33 256c0-32.3 6.9-63 19.3-90.7L158.7 456.7C84.3 420.5 33 344.2 33 256zM256 479c-21.9 0-43-3.2-63-9.1l66.9-194.4 68.5 187.8c.5 1.1 1 2.1 1.6 3.1-23.1 8.1-48 12.6-74 12.6zm30.7-327.5c13.4-.7 25.5-2.1 25.5-2.1 12-1.4 10.6-19.1-1.4-18.4 0 0-36.1 2.8-59.4 2.8-21.9 0-58.7-2.8-58.7-2.8-12-.7-13.4 17.7-1.4 18.4 0 0 11.4 1.4 23.4 2.1l34.7 95.2-48.8 146.3-81.2-241.5c13.4-.7 25.5-2.1 25.5-2.1 12-1.4 10.6-19.1-1.4-18.4 0 0-36.1 2.8-59.4 2.8-4.2 0-9.1-.1-14.4-.3 39.9-60.5 108.4-100.5 186.3-100.5 58 0 110.9 22.2 150.6 58.5-1-.1-1.9-.2-2.9-.2-21.9 0-37.4 19.1-37.4 39.6 0 18.4 10.6 33.9 21.9 52.3 8.5 14.8 18.4 33.9 18.4 61.5 0 19.1-7.3 41.2-17 72.1l-22.2 74.3-80.7-239.6zm81.4 297.2l68.1-196.9c12.7-31.8 17-57.2 17-79.9 0-8.2-.5-15.8-1.5-22.9 17.4 31.8 27.3 68.2 27.3 107 0 82.3-44.6 154.1-110.9 192.7z"/></svg>',
  },
  {
    keys: ['tag manager'],
    bg: '#246FDB',
    svg: '<svg viewBox="0 0 24 24" width="15" height="15" fill="#fff"><path d="M12.003 0a3 3 0 0 0-2.121 5.121l6.865 6.865-4.446 4.541 1.745 1.836a3.432 3.432 0 0 1 .7.739l.012.011-.001.002a3.432 3.432 0 0 1 .609 1.953 3.432 3.432 0 0 1-.09.78l7.75-7.647c.031-.029.067-.05.098-.08.023-.023.038-.052.06-.076a2.994 2.994 0 0 0-.06-4.166l-9-9A2.99 2.99 0 0 0 12.003 0zM8.63 2.133L.88 9.809a2.998 2.998 0 0 0 0 4.238l7.7 7.75a3.432 3.432 0 0 1-.077-.729 3.432 3.432 0 0 1 3.431-3.431 3.432 3.432 0 0 1 .826.101l-5.523-5.81 4.371-4.373-2.08-2.08c-.903-.904-1.193-2.183-.898-3.342zm3.304 16.004a2.932 2.932 0 0 0-2.931 2.931A2.932 2.932 0 0 0 11.934 24a2.932 2.932 0 0 0 2.932-2.932 2.932 2.932 0 0 0-2.932-2.931z"/></svg>',
  },
  {
    keys: ['search console'],
    bg: '#458CF5',
    svg: '<svg viewBox="0 0 24 24" width="15" height="15" fill="#fff"><path d="M8.548 1.156L6.832 2.872v1.682h1.716zm0 3.398v.035H6.832v-.035H3.386L0 7.844v3.577h2.826V8.94c0-.525.429-.954.954-.954h16.476c.525 0 .954.43.954.954v2.48h2.754V7.844l-3.386-3.29H17.3v.035h-1.717v-.035zm7.035 0H17.3V2.872l-1.717-1.716zM8.679 1.188V2.84h6.773V1.188zm11.471 7.07a.834.834 0 00-.132.01l-.543.002c-5.216.014-10.432-.008-15.648.01-.435-.063-.794.436-.716.883v2.264h17.812c-.016-.888.045-1.782-.034-2.666-.104-.342-.427-.502-.739-.502zm-15.422.634a.689.698 0 01.689.698.689.698 0 01-.689.697.689.698 0 01-.688-.697.689.698 0 01.688-.698zm2.134 0a.689.698 0 01.689.698.689.698 0 01-.689.697.689.698 0 01-.688-.697.689.698 0 01.688-.698zM.036 11.645v9.156c0 1.05.858 1.908 1.907 1.908h.883V11.645zm21.174 0v11.064h.882c1.05 0 1.908-.858 1.908-1.908v-9.156zM4.057 13.133v6.85h6.137v-6.85zm13.243.021v3.777l-1.708.977-1.708-.977v-3.758a4.006 4.006 0 000 7.23v2.441h3.457v-2.442a4.006 4.006 0 00-.041-7.248zm-13.243 8.26v1.43h7.925v-1.43z"/></svg>',
  },
  {
    keys: ['merchant center', 'merchants.google'],
    full: true,
    svg: '<svg viewBox="0 0 500 500" width="20" height="20"><path fill="#EA4335" fill-rule="evenodd" d="M291.154 0c-12.302 0-24.005 4.8-32.706 13.5L148.828 123l43.208 43.201 70.313-17.6 68.212 16 43.808-43.8c-11.702-14.2-10.702-35 2.3-48 13.003-13 33.807-14 48.01-2.3l59.41-59.3C475.589 4 464.787 0 453.685 0z" clip-rule="evenodd"/><path fill="#4285F4" d="m483.99 11.3-59.311 59.3c11.702 9.6 16.103 25.5 10.902 39.7s-18.704 23.701-33.807 23.601c-10.802 0-20.803-4.6-27.505-13 .1.1-.1-.1 0 0l-67.712 68.5-48.21-23.3-54.31 28.8-15.702 50.3 15.703 56.501 54.31 24.3 81.515-11.7 37.107 37.1 109.42-109.5c8.802-8.6 13.803-20.4 13.703-32.7V46.5c0-13.5-5.902-26.3-16.103-35.2"/><path fill="#FBBC05" d="M148.828 123 13.703 258.103C4.9 266.802 0 278.702 0 291.102c-.1 12.3 4.9 24.1 13.703 32.7l78.914 78.9 89.617-89.6-15.603-68 25.405-78.8z"/><path fill="#34A853" fill-rule="evenodd" d="m92.617 402.703 83.616 83.6c8.701 8.7 20.403 13.7 32.706 13.7 12.402-.1 24.204-5 33.006-13.7l135.025-135.1-37.107-37.1-77.614 22.5-80.215-23.5z" clip-rule="evenodd"/><path fill="#FFF" fill-rule="evenodd" d="M358.766 225.702H262.25v41.4h55.51c-5.201 26.3-26.805 41.4-55.51 41.4-35.007-1.2-62.412-30.5-61.212-65.5 1.1-33.3 27.905-60 61.212-61.2 14.002 0 27.505 5 38.107 14.1l30.105-31.2c-18.603-17.2-42.908-26.701-68.212-26.801-57.411 0-103.52 47.7-103.52 107.1s46.109 107.102 103.52 107.102c51.81 0 98.818-39 98.818-107.101-.1-6.4-.9-12.9-2.3-19.3" clip-rule="evenodd"/></svg>',
  },
  {
    keys: ['gmail'],
    full: true,
    svg: '<svg width="20" height="20" viewBox="0 0 800 636.36322" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="url(#gm-a)" d="M 627.27193,81.819216 H 799.99875 V 581.8179 c 0,30.12265 -24.42266,54.54532 -54.54531,54.54532 h -90.90885 a 27.272655,27.272655 0 0 1 -27.27266,-27.27266 z" /><path fill="#fc413d" d="M 172.72768,81.819216 H 8.5692711e-4 V 581.8179 c 0,30.12265 24.42266207289,54.54532 54.54531007289,54.54532 h 90.908853 a 27.272655,27.272655 0 0 0 27.27266,-27.27266 z" /><path fill="url(#gm-b)" d="M 141.93685,20.255746 C 105.42331,-10.435083 50.946177,-5.7169131 20.255349,30.796627 -10.435479,67.305622 -5.7173098,121.78275 30.79623,152.47813 l 345.80818,290.6765 a 36.36354,36.36354 0 0 0 46.79533,0 L 769.20792,152.47358 C 805.71691,121.78275 810.43508,67.305622 779.74426,30.792081 749.05343,-5.7169131 694.5763,-10.435083 658.0673,20.255746 L 399.9998,237.18245 Z" /><defs><linearGradient id="gm-a" x1="165" x2="165" y1="44" y2="166" gradientUnits="userSpaceOnUse" gradientTransform="matrix(4.5454426,0,0,4.5454426,-36.362684,-118.18025)"><stop stop-color="#60d673" /><stop offset=".17" stop-color="#42c868" /><stop offset=".39" stop-color="#0ebc5f" /><stop offset=".62" stop-color="#00a9bb" /><stop offset=".86" stop-color="#3c90ff" /><stop offset="1" stop-color="#3186ff" /></linearGradient><linearGradient id="gm-b" x1="8" x2="184" y1="46.130001" y2="46.130001" gradientUnits="userSpaceOnUse" gradientTransform="matrix(4.5454426,0,0,4.5454426,-36.362684,-118.18025)"><stop offset=".08" stop-color="#ff63a0" /><stop offset=".3" stop-color="#fc413d" /><stop offset=".5" stop-color="#fc413d" /><stop offset=".65" stop-color="#fc413d" /><stop offset=".72" stop-color="#fc5c30" /><stop offset=".86" stop-color="#feb10c" /><stop offset=".91" stop-color="#fec700" /><stop offset=".96" stop-color="#ffdb0f" /></linearGradient></defs></svg>',
  },
  {
    keys: ['google calendar'],
    full: true,
    svg: '<svg width="20" height="20" viewBox="0 0 800 859.0954" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="#bbe2ff" d="M 64.743253,150.86554 C 64.743253,67.543758 132.28701,0 215.60879,0 h 368.78242 c 83.32178,0 150.86554,67.543758 150.86554,150.86554 v 159.24695 c 0,83.32178 -67.54376,150.86554 -150.86554,150.86554 H 215.60879 c -83.32178,0 -150.865537,-67.54376 -150.865537,-150.86554 z" /><path fill="#3c90ff" d="M 1.1859076,216.8273 C -9.5475474,135.25514 53.952176,62.86064 136.22104,62.86064 h 527.55792 c 82.2741,0 145.76859,72.3945 135.03513,153.96666 l -32.12702,244.15073 32.12702,244.15072 c 10.73346,81.57216 -52.76103,153.96666 -135.03513,153.96666 H 136.22104 c -82.274102,0 -145.7685874,-72.3945 -135.0351324,-153.96666 L 33.312933,460.97803 Z" /><mask id="gc-a" width="154" height="152" x="19" y="20" maskUnits="userSpaceOnUse"><path fill="#3c90ff" d="M 19.867,49.392 C 17.818,33.82 29.94,20 45.645,20 h 100.71 c 15.706,0 27.827,13.82 25.778,29.392 L 166,96 l 6.133,46.608 C 174.182,158.18 162.061,172 146.355,172 H 45.645 C 29.939,172 17.818,158.18 19.867,142.608 L 26,96 Z" /></mask><g mask="url(#gc-a)" transform="matrix(5.2383867,0,0,5.2383867,-102.88512,-41.907093)"><path fill="url(#gc-b)" d="M 0,0 H 166 V 76 H 0 Z" transform="matrix(1,0,0,-1,13,172)" /></g><mask id="gc-c" width="154" height="152" x="19" y="20" maskUnits="userSpaceOnUse"><path fill="#3186ff" d="M 19.867,49.392 C 17.818,33.82 29.94,20 45.645,20 h 100.71 c 15.706,0 27.827,13.82 25.778,29.392 L 166,96 l 6.133,46.608 C 174.182,158.18 162.061,172 146.355,172 H 45.645 C 29.939,172 17.818,158.18 19.867,142.608 L 26,96 Z" /></mask><g mask="url(#gc-c)" transform="matrix(5.2383867,0,0,5.2383867,-102.88512,-41.907093)"><path fill="url(#gc-d)" d="M 32,27.2 C 32,16.596 40.596,8 51.2,8 h 89.6 C 151.404,8 160,16.596 160,27.2 V 96 H 32 Z" filter="url(#gc-e)" /></g><path fill="#ffffff" d="m 291.84303,656.55843 q -32.90754,0 -56.45409,-10.70202 -23.54655,-10.70203 -39.86412,-28.62779 -16.05566,-18.19815 -22.74508,-35.58436 -6.68942,-17.3862 -5.34839,-21.13689 a 10.84346,10.84346 0 0 1 5.34839,-5.88794 l 29.70165,-11.77066 q 3.74021,-1.8701 7.4909,-0.53431 3.74021,1.06863 8.82668,12.30497 5.35363,11.23634 14.98178,23.8137 a 74.908929,74.908929 0 0 0 23.54655,19.52871 q 13.65124,6.95658 33.70902,6.95658 32.37323,0 51.37286,-18.72724 19.26155,-18.72723 19.26155,-47.62217 0,-31.3046 -20.33542,-48.16173 Q 321.00513,473.283 287.55803,473.283 H 259.4698 a 9.9529347,9.9529347 0 0 1 -6.95657,-2.67158 q -2.67158,-2.94397 -2.67682,-6.68942 v -28.62778 q 0,-4.01785 2.67158,-6.68942 a 9.5338637,9.5338637 0 0 1 6.96181,-2.94398 h 24.34279 q 29.96881,0 48.16172,-16.32281 18.19292,-16.32281 18.19292,-42.27378 0,-25.67857 -16.32281,-41.46707 -16.32282,-15.7885 -44.94536,-15.7885 -16.05566,0 -27.82631,5.35364 a 60.241447,60.241447 0 0 0 -20.33542,14.98178 118.91138,118.91138 0 0 0 -14.71463,19.8011 q -6.14986,10.16771 -9.90055,11.23634 -3.7402,0.80148 -7.22373,-1.33579 l -28.09347,-13.64599 q -3.47829,-1.87535 -4.54692,-5.88795 -1.06863,-4.0126 6.42226,-18.72723 7.75805,-14.98179 23.54131,-30.50313 a 110.00612,110.00612 0 0 1 36.92539,-24.08086 q 21.13689,-8.56476 49.23036,-8.55953 52.17433,0 82.67222,27.55392 30.50312,27.29199 30.50312,72.24259 0,31.03744 -14.98178,53.77728 -14.71987,22.7346 -41.73947,32.11131 v 1.06863 q 32.64039,9.62815 51.36762,35.31196 18.99963,25.42189 18.99439,60.73386 0,50.57138 -35.3172,82.94461 -35.30673,32.37323 -92.03846,32.37323 z m 268.46732,-6.1551 q -4.54692,0 -8.03045,-3.47829 a 11.78637,11.78637 0 0 1 -3.20589,-8.29237 V 341.11326 l -60.19954,43.34241 q -3.21637,2.40966 -7.49613,1.60819 a 10.267238,10.267238 0 0 1 -6.41702,-4.0126 l -17.39145,-24.62042 a 10.372006,10.372006 0 0 1 -1.87534,-7.4909 q 0.80147,-4.27452 4.27976,-6.68418 l 106.75308,-76.25519 q 1.34103,-1.06863 2.94398,-1.60295 1.60818,-0.80147 3.74544,-0.80147 h 22.47792 q 4.54692,0 7.22374,3.21113 2.94397,2.9335 2.94397,7.49089 v 363.3345 q 0,4.81932 -3.47829,8.29237 a 10.476773,10.476773 0 0 1 -8.03045,3.47829 z" /><defs><linearGradient id="gc-b" x1="83" x2="83" y1="76" gradientUnits="userSpaceOnUse"><stop stop-color="#4fa0ff" /><stop offset="1" stop-color="#3186ff" /></linearGradient><linearGradient id="gc-d" x1="89.059998" x2="89.059998" y1="21.75" y2="96.389999" gradientUnits="userSpaceOnUse"><stop stop-color="#a9a8ff" /><stop offset=".8" stop-color="#3c90ff" /></linearGradient><filter id="gc-e" width="152" height="112" x="20" y="-4" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix" /><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" mode="normal" /><feGaussianBlur result="effect1_foregroundBlur_37330_7673" stdDeviation="6" /></filter></defs></svg>',
  },
  {
    keys: ['google analytics'],
    full: true,
    svg: '<svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#F9AB00" d="M45.3,41.6c0,3.2-2.6,5.9-5.8,5.9c-0.2,0-0.5,0-0.7,0c-3-0.4-5.2-3.1-5.1-6.1V6.6c-0.1-3,2.1-5.6,5.1-6.1 c3.2-0.4,6.1,1.9,6.5,5.1c0,0.2,0,0.5,0,0.7V41.6z"/><path fill="#E37400" d="M8.6,35.9c3.2,0,5.8,2.6,5.8,5.8c0,3.2-2.6,5.8-5.8,5.8s-5.8-2.6-5.8-5.8c0,0,0,0,0,0 C2.7,38.5,5.4,35.9,8.6,35.9z M23.9,18.2c-3.2,0.2-5.7,2.9-5.7,6.1V40c0,4.2,1.9,6.8,4.6,7.4c3.2,0.6,6.2-1.4,6.9-4.6 c0.1-0.4,0.1-0.8,0.1-1.2V24.1c0-3.2-2.6-5.9-5.8-5.9C24,18.2,23.9,18.2,23.9,18.2z"/></svg>',
  },
  {
    keys: ['google ads'],
    full: true,
    svg: '<svg width="20" height="20" viewBox="0 -13 256 256" xmlns="http://www.w3.org/2000/svg"><g><path d="M5.888,166.405103 L90.88,20.9 C101.676138,27.2558621 156.115862,57.3844138 164.908138,63.1135172 L79.9161379,208.627448 C70.6206897,220.906621 -5.888,185.040138 5.888,166.396276 L5.888,166.405103 Z" fill="#FBBC04"></path><path d="M250.084224,166.401789 L165.092224,20.9055131 C153.210293,1.13172 127.619121,-6.05393517 106.600638,5.62496138 C85.582155,17.3038579 79.182155,42.4624786 91.0640861,63.1190303 L176.056086,208.632961 C187.938017,228.397927 213.52919,235.583582 234.547672,223.904686 C254.648086,212.225789 261.966155,186.175582 250.084224,166.419444 L250.084224,166.401789 Z" fill="#4285F4"></path><ellipse fill="#34A853" cx="42.6637241" cy="187.924414" rx="42.6637241" ry="41.6044138"></ellipse></g></svg>',
  },
  {
    keys: ['shopify'],
    full: true,
    svg: '<svg viewBox="0 0 512 512" width="20" height="20"><path d="M425.9 98.7c-.3-2.7-2.7-3.9-4.5-4.2s-38.1-.6-38.1-.6-30.6-29.7-33.6-32.7-8.8-2.1-11.2-1.5c0 0-5.8 1.8-15.4 4.8-1.5-5.1-3.9-11.5-7.3-17.9-10.9-20.9-26.6-31.8-46-31.8-1.2 0-2.7 0-3.9.3-.6-.6-1.2-1.2-1.8-2.1-8.7-9-19.3-13.3-32-13-24.8.6-49.4 18.5-69.6 50.6-14.2 22.4-24.8 50.6-27.9 72.4-28.5 8.8-48.4 14.8-48.7 15.1-14.2 4.5-14.8 4.8-16.7 18.5-1.5 10-39.1 301-39.1 301L345.3 512l136.5-33.9c.1 0-55.6-377-55.9-379.4M307.2 69.3c-7.3 2.1-15.4 4.8-24.5 7.6-.3-12.4-1.8-30-7.6-45.1 19 3.6 28.1 24.8 32.1 37.5m-40.9 12.8c-16.7 5.1-34.5 10.6-52.7 16.3 5.1-19.4 14.8-38.8 26.6-51.5 4.5-4.8 10.6-10 17.9-13 7 14.3 8.2 34.5 8.2 48.2m-33.9-65.4c5.8 0 10.6 1.2 14.8 3.9-6.7 3.3-13.3 8.5-19.4 15.1-15.7 17-27.9 43-32.7 68.4-15.1 4.5-29.7 9.1-43.3 13.3 9.1-39.9 42.4-99.5 80.6-100.7" style="fill:#95bf47"/><path d="M421.3 94.5c-1.8-.3-38.1-.6-38.1-.6s-30.6-29.7-33.6-32.7c-1.2-1.2-2.7-1.8-4.2-1.8V512l136.5-33.9s-55.7-376.6-56-379.4c-.7-2.7-2.8-3.9-4.6-4.2" style="fill:#5e8e3e"/><path d="M269.6 164.7 253.9 224s-17.6-8.2-38.8-6.7c-30.9 1.8-31.2 21.2-30.9 26.3 1.8 26.6 71.5 32.4 75.4 94.5 3 49-26 82.4-67.8 85.1-50.3 3-77.8-26.3-77.8-26.3l10.6-45.1s27.9 20.9 50 19.7c14.5-.9 19.7-12.7 19.1-21.2-2.1-34.5-59-32.7-62.7-89.3-3-47.8 28.5-96.3 97.8-100.8 27.2-2.4 40.8 4.5 40.8 4.5" style="fill:#fff"/></svg>',
  },
  {
    keys: ['asana'],
    bg: '#F06A6A',
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M18.78 12.653c-2.882 0-5.22 2.336-5.22 5.22s2.338 5.22 5.22 5.22 5.22-2.34 5.22-5.22-2.336-5.22-5.22-5.22zm-13.56 0c-2.88 0-5.22 2.337-5.22 5.22s2.338 5.22 5.22 5.22 5.22-2.338 5.22-5.22-2.336-5.22-5.22-5.22zm12-6.525c0 2.883-2.337 5.22-5.22 5.22-2.882 0-5.22-2.337-5.22-5.22 0-2.88 2.338-5.22 5.22-5.22 2.883 0 5.22 2.34 5.22 5.22z"/></svg>',
  },
  {
    keys: ['siteground'],
    full: true,
    svg: '<img src="data:image/png;base64,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" width="20" height="20" alt="" />',
  },
];

function brandIconFor(item) {
  const hay = `${item.label || ''} ${item.url || ''}`.toLowerCase();
  return BRAND_ICONS.find((b) => b.keys.some((k) => hay.includes(k)));
}

function normalizeUrl(u) {
  u = (u || '').trim();
  if (!u) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
  return u;
}
function hostOf(u) {
  if (isAppUrl(u)) return APP_KIND;
  try { return new URL(u).host.replace(/^www\./, ''); } catch (_) { return u; }
}
// Scorciatoie ad app installate: su Mac file:///Applications/Nome.app,
// su Windows file:///C:/…/Nome.lnk (collegamento del menu Start) o .exe
// Versione web (cloud/public): niente app installate, profili Chrome, anteprime dei siti e widget
const IS_WEB = window.api.platform === 'web';
const IS_WIN = window.api.platform === 'win32' || (IS_WEB && /Win/i.test(navigator.platform));
const APP_KIND = IS_WIN ? 'App di Windows' : 'App del Mac';
const MOD_KEY = IS_WIN ? 'Ctrl+K' : '⌘K';
const isAppUrl = (u) => /^file:\/\/.*\.(app\/?|lnk|exe)$/i.test(u || '');
function appPathToUrl(p) {
  p = p.replace(/\\/g, '/');
  if (/^[a-z]:/i.test(p)) p = '/' + p; // C:/… -> /C:/…
  return 'file://' + p.split('/').map((seg) => (/^[a-z]:$/i.test(seg) ? seg : encodeURIComponent(seg))).join('/');
}
function appUrlToPath(u) {
  try {
    const p = decodeURIComponent(new URL(u).pathname).replace(/\/$/, '');
    return /^\/[a-z]:/i.test(p) ? p.slice(1).replace(/\//g, '\\') : p; // /C:/… -> C:\…
  } catch (_) { return ''; }
}
function deriveLabel(u) {
  try {
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./, '');
    const segs = url.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    if (segs.length) return `${host} – ${decodeURIComponent(segs[segs.length - 1]).slice(0, 30)}`;
    return host;
  } catch (_) { return u; }
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 1800);
}

async function copy(text, msg = 'Copiato negli appunti') {
  await window.api.copy(text);
  toast(msg);
}

// ---------- Modal ----------
function openForm({ title, fields, submitLabel = 'Salva', onSubmit }) {
  const dlg = $('#modal');
  dlg.innerHTML = '';
  const inputs = {};
  const iconSetters = {};
  const form = h('form', { method: 'dialog' }, h('h2', null, title));
  for (const f of fields.filter(Boolean)) {
    let input;
    if (f.type === 'app') {
      form.append(h('label', { class: 'field' }, h('span', null, f.label), appSelect(f.value, inputs, iconSetters)));
      continue;
    }
    if (f.type === 'textarea') input = h('textarea', { value: f.value || '', placeholder: f.placeholder || '', rows: f.rows || 5 });
    else if (f.type === 'select') {
      const opts = f.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
      if (f.empty) opts.unshift({ value: '', label: '—' });
      input = h('select', null, opts.map((o) => h('option', { value: o.value, selected: o.value === f.value }, o.label)));
    } else if (f.type === 'date' || f.type === 'number') {
      input = h('input', { type: f.type, value: f.value ?? '', step: f.type === 'number' ? 'any' : null });
    } else if (f.type === 'icon') {
      const icon = iconInput(f.value, f.placeholder);
      inputs[f.name] = icon.input;
      iconSetters[f.name] = icon.set;
      form.append(h('div', { class: 'field' }, h('span', null, f.label), icon.el));
      continue;
    } else input = h('input', { type: 'text', value: f.value || '', placeholder: f.placeholder || '' });
    inputs[f.name] = input;
    form.append(h('label', { class: 'field' }, h('span', null, f.label), input));
  }
  const cancel = h('button', { type: 'button', class: 'ghost', onclick: () => dlg.close() }, 'Annulla');
  const ok = h('button', { type: 'submit', class: 'primary' }, submitLabel);
  form.append(h('div', { class: 'modal-actions' }, cancel, ok));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const values = {};
    for (const [k, el] of Object.entries(inputs)) values[k] = el.value.trim();
    if (onSubmit(values) !== false) dlg.close();
  });
  dlg.append(form);
  dlg.showModal();
  const first = Object.values(inputs)[0];
  if (first) first.focus();
}

// --- Campo icona: emoji/URL oppure immagine caricata dal disco (salvata come data URL)
const ICON_SIZE = 64;
function imageFileToDataUrl(file, size = ICON_SIZE) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Immagine non valida'));
      img.onload = () => {
        // Ridimensiona (contain) per non appesantire il file dei dati
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const scale = Math.min(size / (img.width || size), size / (img.height || size));
        const w = (img.width || size) * scale, hgt = (img.height || size) * scale;
        canvas.getContext('2d').drawImage(img, (size - w) / 2, (size - hgt) / 2, w, hgt);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function iconInput(value, placeholder) {
  // Il data URL resta nell'input nascosto; quello visibile serve per emoji/URL
  const hidden = h('input', { type: 'hidden', value: value || '' });
  const text = h('input', { type: 'text', placeholder: placeholder || '' });
  const preview = h('div', { class: 'icon-preview' });
  const file = h('input', { type: 'file', accept: 'image/*', style: 'display:none' });
  const removeBtn = h('button', { type: 'button', class: 'ghost small' }, 'Rimuovi');

  const sync = (fromText = false) => {
    const v = hidden.value;
    const isData = v.startsWith('data:');
    if (!fromText) text.value = isData ? '' : v;
    text.disabled = isData;
    text.placeholder = isData ? 'Immagine caricata' : (placeholder || '');
    preview.innerHTML = '';
    if (/^(https?:|data:)/.test(v)) preview.append(h('img', { src: v, alt: '' }));
    else if (v) preview.append(v);
    preview.style.display = v ? '' : 'none';
    removeBtn.style.display = v ? '' : 'none';
  };
  text.addEventListener('input', () => { hidden.value = text.value; sync(true); });
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    try { hidden.value = await imageFileToDataUrl(f); sync(); }
    catch (err) { text.placeholder = err.message; }
    file.value = '';
  });
  removeBtn.addEventListener('click', () => { hidden.value = ''; sync(); });
  sync();

  const uploadBtn = h('button', { type: 'button', class: 'ghost small', onclick: () => file.click() }, 'Carica immagine…');
  const el = h('div', { class: 'icon-input' }, preview, text, uploadBtn, removeBtn, file, hidden);
  return { el, input: hidden, set: (v) => { hidden.value = v || ''; sync(); } };
}

// --- Tendina "App del Mac" / "App di Windows": sceglie un'app installata e compila etichetta, URL e icona
function appSelect(selectedPath, inputs, iconSetters) {
  const select = h('select', { disabled: true }, h('option', { value: '' }, 'Caricamento app…'));
  const auto = { label: '', icon: '' }; // valori compilati in automatico, sovrascrivibili
  window.api.listApps().then((apps) => {
    select.innerHTML = '';
    select.append(h('option', { value: '' }, '— Nessuna (link web) —'));
    if (selectedPath && !apps.some((a) => a.path === selectedPath)) {
      apps.unshift({ name: selectedPath.split(/[\\/]/).pop().replace(/\.(app|lnk|exe)$/i, '') + ' (non trovata)', path: selectedPath });
    }
    for (const a of apps) select.append(h('option', { value: a.path, selected: a.path === selectedPath }, a.name));
    select.disabled = false;
  });
  select.addEventListener('change', async () => {
    const p = select.value;
    if (!p) {
      if (isAppUrl(inputs.url.value)) inputs.url.value = '';
      return;
    }
    const name = select.selectedOptions[0].textContent;
    inputs.url.value = appPathToUrl(p);
    if (!inputs.label.value.trim() || inputs.label.value === auto.label) inputs.label.value = auto.label = name;
    if (inputs.icon && (!inputs.icon.value || inputs.icon.value === auto.icon)) {
      const icon = await window.api.appIcon(p);
      if (icon && select.value === p) { auto.icon = icon; iconSetters.icon(icon); }
    }
  });
  return select;
}

// --- Editor di testo con stili (grassetto, corsivo, elenchi…)
const RTE_COMMANDS = [
  ['bold', 'bold', 'Grassetto'],
  ['italic', 'italic', 'Corsivo'],
  ['underline', 'underline', 'Sottolineato'],
  ['strikeThrough', 'strikethrough', 'Barrato'],
  ['insertUnorderedList', 'list-ul', 'Elenco'],
  ['insertOrderedList', 'list-ol', 'Elenco numerato'],
];
function richTextInput(value) {
  const content = h('div', { class: 'rte-content', contenteditable: 'true' });
  content.innerHTML = value || '';
  const toolbar = h('div', { class: 'rte-toolbar' }, RTE_COMMANDS.map(([cmd, iconName, title]) =>
    h('button', { type: 'button', title,
      onmousedown: (e) => e.preventDefault(),
      onclick: () => { document.execCommand(cmd); content.focus(); } }, icon(iconName))));
  return h('div', { class: 'rte' }, toolbar, content);
}

function confirmBox(message, onYes, label = 'Elimina') {
  const dlg = $('#modal');
  dlg.innerHTML = '';
  dlg.append(
    h('h2', null, message),
    h('div', { class: 'modal-actions' },
      h('button', { class: 'ghost', onclick: () => dlg.close() }, 'Annulla'),
      h('button', { class: 'primary', onclick: () => { dlg.close(); onYes(); } }, label)
    )
  );
  dlg.showModal();
}

// ---------- State ----------
const DEFAULT_SITE_URLS = [];
function defaultSites() {
  return DEFAULT_SITE_URLS.map((url) => ({ id: uid(), label: deriveLabel(url), url, thumb: null, capturedAt: null }));
}

// Strumenti già presenti in una nuova installazione
const DEFAULT_TOOLS = [
  { category: 'Progetti', label: 'Asana', url: 'https://app.asana.com' },
  { category: 'Progetti', label: 'Gmail', url: 'https://mail.google.com' },
  { category: 'Progetti', label: 'Google Drive', url: 'https://drive.google.com' },
  { category: 'Progetti', label: 'Google Calendar', url: 'https://calendar.google.com' },
  { category: 'Sviluppo e hosting', label: 'Siti SAL', url: 'https://docs.google.com/spreadsheets/d/13f5-f5vskaJMmoYdtWHMokvF3-5ecj6y6KOZUPhgvD0/edit?gid=383361820#gid=383361820' },
  { category: 'Agency', label: 'Forms S3', url: 'https://forms.solferino3.agency/pannello', icon: 'https://forms.solferino3.agency/apple-touch-icon.png' },
  { category: 'Agency', label: 'Popup S3', url: 'https://popup.solferino3.agency/pannello', icon: 'https://forms.solferino3.agency/apple-touch-icon.png' },
  { category: 'Agency', label: 'Hub S3', url: 'https://hub.solferino3.agency/hub', icon: 'https://hub.solferino3.agency/wp-content/plugins/solferino3-centralino/assets/logo-s3-192.png?v=2.66.1' },
  { category: 'Agency', label: 'Campagne S3', url: 'https://campagne.solferino3.agency/pannello', icon: 'data:image/png;base64,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' },
];
// Il kit pubblicato dagli admin (account Solferino 3) sostituisce quello incluso nell'app
const kitTools = () => (cloudState.sharedTools && cloudState.sharedTools.length ? cloudState.sharedTools : DEFAULT_TOOLS);
function defaultTools() {
  return kitTools().map((t) => ({ id: uid(), icon: '', chromeProfile: '', ...t }));
}

function seedData() {
  return normalizeState({ sites: defaultSites(), tools: defaultTools() });
}

let state;
let page = 'home';
let editing = false;
let query = '';
let appuntoFormFor = null; // null | 'new' | id dell'appunto mio in modifica | proprietario/id di uno ricevuto
let todoArchiveOpen = false;

let saveTimer;
function save() {
  clearTimeout(save._t);
  save._t = setTimeout(() => window.api.save(state), 250);
}

// ---------- Pages ----------
// Sezioni comuni a tutti i profili
const COMMON_PAGES = [
  { id: 'home', label: 'Home', icon: 'house' },
  { id: 'tools', label: 'Strumenti', icon: 'screwdriver-wrench' },
  { id: 'idee', label: 'Idee', icon: 'lightbulb' },
  { id: 'todos', label: 'To-do', icon: 'square-check' },
  { id: 'asana', label: 'Asana', icon: 'bell' },
  { id: 'notes', label: 'Note', icon: 'pen-to-square' },
  { id: 'appunti', label: 'Appunti', icon: 'note-sticky' },
  { id: 'snippets', label: 'Snippet', icon: 'quote-left' },
];
// Sezioni aggiunte dal profilo scelto nelle impostazioni
const PROFILE_PAGES = {
  utm: { label: 'Generatore UTM', icon: 'link' },
  calendario: { label: 'Calendario editoriale', icon: 'calendar-days' },
  palette: { label: 'Palette colori', icon: 'palette' },
  font: { label: 'Font', icon: 'font' },
  shooting: { label: 'Shooting', icon: 'camera' },
  pixieset: { label: 'Pixieset', icon: 'images' },
  lead: { label: 'Lead', icon: 'handshake' },
  preventivi: { label: 'Preventivi', icon: 'file-invoice' },
  progetti: { label: 'Progetti', icon: 'folder-open' },
  scadenze: { label: 'Scadenze', icon: 'hourglass-half' },
};
const PROFILES = [
  { id: 'smm', label: 'Social Media Manager', icon: 'hashtag', pages: ['utm', 'calendario'] },
  { id: 'grafico', label: 'Grafico', icon: 'pen-nib', pages: ['palette', 'font'] },
  { id: 'fotografo', label: 'Fotografo', icon: 'camera-retro', pages: ['shooting', 'pixieset'] },
  { id: 'commerciale', label: 'Commerciale', icon: 'briefcase', pages: ['lead', 'preventivi'] },
  { id: 'pm', label: 'Project Manager', icon: 'list-check', pages: ['progetti', 'scadenze'] },
];
const SETTINGS_PAGE = { id: 'settings', label: 'Impostazioni', icon: 'gear' };
const EDITABLE = new Set(['tools', 'idee', 'snippets', 'appunti', 'palette', 'pixieset']);

const currentProfile = () => PROFILES.find((p) => p.id === state.settings.profile) || PROFILES[0];
const pageMeta = (id) => ({ id, ...PROFILE_PAGES[id] });
const profilePages = () => currentProfile().pages.map(pageMeta);
// Strumenti di altri profili attivati con la spunta nelle impostazioni (nell'ordine di PROFILE_PAGES)
const extraPages = () => Object.keys(PROFILE_PAGES)
  .filter((id) => state.settings.extraPages.includes(id) && !currentProfile().pages.includes(id)).map(pageMeta);
const toolPageIds = () => [...profilePages(), ...extraPages()].map((p) => p.id);
const visiblePages = () => [...COMMON_PAGES, ...profilePages(), ...extraPages(), SETTINGS_PAGE];

function navItem(p, extraClass = '') {
  const count = p.id === 'asana' ? asanaState.unseen.length : p.id === 'appunti' ? cloudState.unseenNotes?.length || 0 : 0;
  return h('button', { class: `nav-item${p.id === page ? ' active' : ''}${extraClass}`, onclick: () => go(p.id) },
    h('span', { class: 'nav-icon' }, icon(p.icon)), p.label,
    count > 0 && h('span', { class: 'nav-badge', title: p.id === 'asana' ? 'Task nuovi' : 'Appunti condivisi nuovi' }, count));
}

function renderNav() {
  const nav = $('#nav');
  nav.innerHTML = '';
  nav.append(
    ...COMMON_PAGES.map((p) => navItem(p)),
    h('div', { class: 'nav-section' }, currentProfile().label),
    ...profilePages().map((p) => navItem(p)),
    ...(extraPages().length ? [h('div', { class: 'nav-section' }, 'Altri strumenti')] : []),
    ...extraPages().map((p) => navItem(p)),
    navItem(SETTINGS_PAGE, ' nav-bottom'));
}

function go(id) {
  if (flushAppunto) { flushAppunto(); stopAppuntoAutosave(); }
  if (page === 'asana' && id !== 'asana') asanaHighlight = new Set();
  if (page === 'appunti' && id !== 'appunti') notesHighlight = new Set();
  page = id;
  editing = false;
  if (id !== 'home') query = '';
  appuntoFormFor = null;
  render();
}

function render() {
  // Cambiando profilo la sezione aperta potrebbe non esserci più
  let meta = visiblePages().find((p) => p.id === page);
  if (!meta) { page = 'home'; meta = COMMON_PAGES[0]; }
  renderNav();
  $('#page-title').textContent = page === 'home' ? greeting() : meta.label;
  const btn = $('#btn-edit');
  btn.hidden = !EDITABLE.has(page) && !RECORD_TYPES[page];
  btn.classList.toggle('active', editing);
  btn.textContent = editing ? 'Fine' : 'Modifica';
  const view = $('#view');
  view.classList.toggle('editing', editing);
  view.innerHTML = '';
  const renderers = { home: renderHome, tools: renderTools, idee: renderIdee, todos: renderTodos,
    notes: renderNotes, appunti: renderAppunti, utm: renderUtm, snippets: renderSnippets,
    palette: renderPalette, pixieset: renderPixieset, asana: renderAsana, settings: renderSettings };
  (renderers[page] || ((v) => renderRecords(v, page)))(view);
}

function greeting() {
  const hr = new Date().getHours();
  return hr < 6 ? 'Buonanotte' : hr < 13 ? 'Buongiorno' : hr < 18 ? 'Buon pomeriggio' : 'Buonasera';
}

// --- Link tile
function linkTile(item, { sub, onEdit, onDelete } = {}) {
  const customIcon = (item.icon || '').trim();
  const isImageIcon = /^(https?:|data:)/.test(customIcon);
  const brand = !customIcon ? brandIconFor(item) : null;
  let badge;
  if (isImageIcon) {
    badge = h('div', { class: 'badge', style: 'background:#fff;border:1px solid rgba(0,0,0,.08)' },
      h('img', { src: customIcon, width: '20', height: '20', alt: '' }));
  } else if (customIcon) {
    badge = h('div', { class: 'badge', style: `background:${colorFor(item.label)}` }, customIcon);
  } else if (brand) {
    badge = h('div', { class: 'badge', style: brand.full
      ? 'background:#fff;border:1px solid rgba(0,0,0,.08)'
      : `background:${brand.bg}` });
    badge.innerHTML = brand.svg;
  } else {
    badge = h('div', { class: 'badge', style: `background:${colorFor(item.label)}` }, (item.label[0] || '?').toUpperCase());
  }

  // Profilo Chrome scelto per lo strumento: si vede sotto il nome
  const profile = item.chromeProfile && chromeProfileOf(item);
  const open = () => window.api.openExternal(normalizeUrl(item.url), item.chromeProfile || '');
  const tile = h('div', { class: 'link-tile', role: 'button', tabindex: '0',
    onclick: (e) => { if (e.target.closest('.tile-actions')) return; open(); },
    onkeydown: (e) => { if (e.key === 'Enter') open(); },
    title: profile ? `${item.url}\nSi apre con il profilo Chrome "${profileLabel(profile)}"` : item.url },
    badge,
    h('div', { class: 'meta' }, h('div', { class: 'name' }, item.label),
      h('div', { class: 'sub' }, [sub || hostOf(item.url), profile && `👤 ${profile.name}`].filter(Boolean).join(' · '))),
    (onEdit || onDelete) && h('div', { class: 'tile-actions' },
      onEdit && h('button', { class: 'icon', title: 'Modifica', onclick: onEdit }, icon('pen')),
      onDelete && h('button', { class: 'icon', title: 'Elimina', onclick: onDelete }, icon('xmark')))
  );
  return tile;
}

// --- HOME
function searchAll(q) {
  q = q.toLowerCase();
  const out = [];
  for (const t of state.tools) {
    if ((t.label + ' ' + t.url + ' ' + t.category).toLowerCase().includes(q)) out.push({ item: t, sub: t.category });
  }
  return out;
}

function renderHome(view) {
  const input = h('input', { type: 'text', id: 'search', placeholder: 'Cerca link e strumenti…', value: query,
    oninput: (e) => { query = e.target.value; renderHomeBody(); } });
  view.append(h('div', { class: 'search' }, icon('magnifying-glass', 'search-icon'), input, h('kbd', null, MOD_KEY)), h('div', { id: 'home-body' }));
  renderHomeBody();
}

function renderHomeBody() {
  const body = $('#home-body');
  body.innerHTML = '';
  if (query.trim()) {
    const res = searchAll(query.trim());
    body.append(h('div', { class: 'section-title' }, `Risultati (${res.length})`));
    body.append(res.length
      ? h('div', { class: 'grid' }, res.map((r) => linkTile(r.item, { sub: r.sub })))
      : h('div', { class: 'empty' }, 'Nessun risultato.'));
    return;
  }

  const datedPages = toolPageIds().filter((id) => RECORD_TYPES[id]?.upcoming);
  if (datedPages.length) {
    const next = upcomingRecords(datedPages);
    body.append(h('div', { class: 'section-title' }, 'In programma'));
    body.append(next.length
      ? h('div', { class: 'card records' }, next.map(({ key, r }) => recordRow(key, r, { onOpen: () => go(key), showPage: true })))
      : h('div', { class: 'empty' }, 'Niente in programma.'));
  }

  body.append(h('div', { class: 'section-title' }, 'Strumenti'));
  body.append(state.tools.length
    ? h('div', { class: 'grid' }, state.tools.map((t) => linkTile(t, { sub: t.category })))
    : h('div', { class: 'empty' }, 'Nessuno strumento. Aggiungili dalla sezione Strumenti.'));

  const open = state.todos.filter((t) => !t.done).slice(0, 5);
  body.append(h('div', { class: 'section-title' }, 'To-do aperti'));
  body.append(open.length
    ? h('div', { class: 'card' }, open.map((t) => todoRow(t, renderHomeBody)))
    : h('div', { class: 'empty' }, 'Niente in sospeso.'));
}

function linkFields(l = {}) {
  return [
    { name: 'label', label: 'Etichetta', value: l.label || '', placeholder: 'Es. Admin WordPress' },
    { name: 'url', label: 'URL', value: l.url || '', placeholder: 'https://…' },
  ];
}

// --- STRUMENTI / LIBRERIE / IDEE (liste di link raggruppate per categoria)
// Profili di Chrome (letti all'avvio): uno strumento può aprirsi sempre con un certo account
let chromeProfiles = [];
const profileLabel = (p) => (p.email && p.email !== p.name ? `${p.name} — ${p.email}` : p.name);
const chromeProfileOf = (item) => chromeProfiles.find((p) => p.dir === item.chromeProfile);

function toolFields(t = {}) {
  const profileField = chromeProfiles.length > 0 && { name: 'chromeProfile', type: 'select', label: 'Apri con il profilo Chrome',
    value: t.chromeProfile || '', options: [{ value: '', label: 'Quello già aperto (predefinito)' },
      ...chromeProfiles.map((p) => ({ value: p.dir, label: profileLabel(p) }))] };
  return [
    !IS_WEB && { name: 'app', type: 'app', label: `${APP_KIND} (facoltativo)`, value: isAppUrl(t.url) ? appUrlToPath(t.url) : '' },
    ...linkFields(t),
    profileField,
    { name: 'category', label: 'Categoria', value: t.category || '', placeholder: 'Es. Marketing' },
    { name: 'icon', type: 'icon', label: 'Icona (emoji, URL o immagine)', value: t.icon || '', placeholder: 'Es. 🎨 oppure https://…/icon.png' }];
}
// tab: id della scheda di Idee (gli elementi di quella sezione stanno tutti in state[key])
function renderLinkSection(view, key, { addLabel, singular, tab }) {
  view.append(h('div', { class: 'row', style: 'margin-bottom:6px' },
    h('button', { class: 'primary', onclick: () => openForm({ title: `Nuovo ${singular}`, fields: toolFields(),
      onSubmit: (v) => {
        if (!v.label || !v.url) return false;
        state[key].push({ id: uid(), label: v.label, url: normalizeUrl(v.url), category: v.category || 'Altro', icon: v.icon || '', chromeProfile: v.chromeProfile || '',
          ...(tab ? { tab } : {}) });
        save(); render();
      } }) }, `+ ${addLabel}`)));
  const list = tab ? state[key].filter((t) => t.tab === tab) : state[key];
  const cats = [...new Set(list.map((t) => t.category))];
  if (!cats.length) view.append(h('div', { class: 'empty' }, `Nessun${singular.endsWith('a') ? 'a' : 'o'} ${singular}.`));
  for (const cat of cats) {
    view.append(h('div', { class: 'section-title' }, cat));
    view.append(h('div', { class: 'grid' }, list.filter((t) => t.category === cat).map((t) =>
      linkTile(t, {
        onEdit: () => openForm({ title: `Modifica ${singular}`, fields: toolFields(t),
          onSubmit: (v) => {
            if (!v.label || !v.url) return false;
            t.label = v.label; t.url = normalizeUrl(v.url); t.category = v.category || 'Altro'; t.icon = v.icon || '';
            t.chromeProfile = v.chromeProfile || ''; save(); render();
          } }),
        onDelete: () => { state[key] = state[key].filter((x) => x.id !== t.id); save(); render(); },
      }))));
  }
}
function renderTools(view) {
  renderLinkSection(view, 'tools', { addLabel: 'Nuovo strumento', singular: 'strumento' });
}

// --- IDEE: schede a piacere, di due tipi: link (come Strumenti) o siti con anteprima
// Le schede stanno in state.ideeTabs; link e siti in state.ideaLinks / state.sites con il campo tab.
const IDEE_TAB_TYPES = [
  { value: 'links', label: 'Link' },
  { value: 'sites', label: 'Siti con anteprima' },
];
const DEFAULT_IDEE_TABS = [
  { id: 'libraries', label: 'Librerie', type: 'links' },
  { id: 'ideas', label: 'Idee', type: 'links' },
  { id: 'sites', label: 'Siti belli', type: 'sites' },
];
let ideeTab = 'libraries';
const capturingIds = new Set();

const currentIdeeTab = () => state.ideeTabs.find((t) => t.id === ideeTab) || state.ideeTabs[0];
const ideeTabItems = (t) => (t.type === 'sites' ? state.sites : state.ideaLinks).filter((x) => x.tab === t.id);

function addIdeeTab() {
  openForm({ title: 'Nuova scheda', submitLabel: 'Aggiungi',
    fields: [
      { name: 'label', label: 'Nome', placeholder: 'Es. Ispirazioni' },
      { name: 'type', label: 'Contenuto', type: 'select', value: 'links', options: IDEE_TAB_TYPES },
    ],
    onSubmit: (v) => {
      if (!v.label) return false;
      const t = { id: uid(), label: v.label, type: v.type === 'sites' ? 'sites' : 'links' };
      state.ideeTabs.push(t);
      ideeTab = t.id;
      save(); render();
    } });
}

function renameIdeeTab(t) {
  openForm({ title: 'Rinomina scheda', submitLabel: 'Salva',
    fields: [{ name: 'label', label: 'Nome', value: t.label }],
    onSubmit: (v) => {
      if (!v.label) return false;
      t.label = v.label; save(); render();
    } });
}

function deleteIdeeTab(t) {
  if (state.ideeTabs.length === 1) return toast('Serve almeno una scheda');
  const n = ideeTabItems(t).length;
  confirmBox(n ? `Eliminare la scheda "${t.label}" e ${n === 1 ? 'l\'elemento che contiene' : `i ${n} elementi che contiene`}?` : `Eliminare la scheda "${t.label}"?`, () => {
    state.ideeTabs = state.ideeTabs.filter((x) => x.id !== t.id);
    if (t.type === 'sites') state.sites = state.sites.filter((x) => x.tab !== t.id);
    else state.ideaLinks = state.ideaLinks.filter((x) => x.tab !== t.id);
    if (ideeTab === t.id) ideeTab = state.ideeTabs[0].id;
    save(); render();
  });
}

function renderIdee(view) {
  const cur = currentIdeeTab();
  ideeTab = cur.id;
  view.append(h('div', { class: 'subtabs' },
    state.ideeTabs.map((t) => h('span', { class: 'subtab-wrap' },
      h('button', { class: 'subtab' + (t.id === cur.id ? ' active' : ''), title: 'Doppio clic per rinominare',
        onclick: () => { ideeTab = t.id; render(); }, ondblclick: () => renameIdeeTab(t) }, t.label),
      editing && h('button', { class: 'icon', title: 'Rinomina', onclick: () => renameIdeeTab(t) }, icon('pen')),
      editing && state.ideeTabs.length > 1 && h('button', { class: 'icon', title: 'Elimina scheda', onclick: () => deleteIdeeTab(t) }, icon('xmark')))),
    h('button', { class: 'subtab subtab-add', title: 'Nuova scheda', onclick: addIdeeTab }, '+')));
  const body = h('div', { class: 'subtab-body' });
  view.append(body);
  if (cur.type === 'sites') renderSites(body, cur.id);
  else renderLinkSection(body, 'ideaLinks', { addLabel: 'Nuovo link', singular: 'link', tab: cur.id });
}

function siteFields(s = {}) {
  return [
    { name: 'label', label: 'Etichetta', value: s.label || '', placeholder: 'Es. Nome del sito (opzionale)' },
    { name: 'url', label: 'URL', value: s.url || '', placeholder: 'https://…' },
  ];
}
function addSite(tab) {
  openForm({ title: 'Nuovo sito', fields: siteFields(),
    onSubmit: (v) => {
      if (!v.url) return false;
      const url = normalizeUrl(v.url);
      const item = { id: uid(), label: v.label || deriveLabel(url), url, thumb: null, capturedAt: null, tab };
      state.sites.push(item); save(); render();
      if (!IS_WEB) captureSite(item);
    } });
}
function editSite(s) {
  openForm({ title: 'Modifica sito', fields: siteFields(s),
    onSubmit: (v) => {
      if (!v.url) return false;
      s.url = normalizeUrl(v.url); s.label = v.label || deriveLabel(s.url); save(); render();
    } });
}
function deleteSite(s) {
  confirmBox(`Eliminare "${s.label}"?`, () => {
    state.sites = state.sites.filter((x) => x.id !== s.id); save(); render();
  });
}
const sitesVisible = () => page === 'idee' && currentIdeeTab().type === 'sites';
function renderIfSitesVisible() {
  if (sitesVisible()) render();
}
async function captureSite(s) {
  capturingIds.add(s.id);
  renderIfSitesVisible();
  const res = await window.api.captureSite(s.id, s.url);
  capturingIds.delete(s.id);
  if (res && res.url) { s.thumb = res.url; s.capturedAt = Date.now(); save(); }
  else toast(`Screenshot "${s.label}" non riuscito`);
  renderIfSitesVisible();
}
let captureQueueRunning = false;
async function captureAllMissing(tab) {
  if (captureQueueRunning) return;
  captureQueueRunning = true;
  for (const s of state.sites.filter((s) => s.tab === tab && !s.thumb)) {
    if (!sitesVisible() || ideeTab !== tab) break;
    await captureSite(s);
  }
  captureQueueRunning = false;
}

function siteCard(s) {
  const capturing = capturingIds.has(s.id);
  const thumbInner = s.thumb
    ? h('img', { src: s.thumb, alt: '' })
    : h('div', { class: 'site-thumb-empty' }, capturing ? 'Cattura in corso…' : IS_WEB ? hostOf(s.url) : 'Nessuno screenshot');
  return h('div', { class: 'site-card' },
    h('button', { class: 'site-thumb', onclick: () => window.api.openExternal(normalizeUrl(s.url)), title: s.url }, thumbInner),
    h('div', { class: 'site-meta' },
      h('div', { class: 'site-name' }, s.label),
      h('div', { class: 'site-host' }, hostOf(s.url))),
    h('div', { class: 'site-actions' },
      !IS_WEB && h('button', { class: 'ghost small', disabled: capturing, onclick: () => captureSite(s) }, s.thumb ? 'Aggiorna' : 'Cattura'),
      editing && h('button', { class: 'icon', title: 'Modifica', onclick: () => editSite(s) }, icon('pen')),
      editing && h('button', { class: 'icon', title: 'Elimina', onclick: () => deleteSite(s) }, icon('xmark'))));
}
function renderSites(view, tab) {
  const sites = state.sites.filter((s) => s.tab === tab);
  const missing = sites.filter((s) => !s.thumb).length;
  view.append(h('div', { class: 'row', style: 'margin-bottom:6px' },
    h('button', { class: 'primary', onclick: () => addSite(tab) }, '+ Nuovo sito'),
    missing > 0 && !IS_WEB && h('button', { class: 'ghost small', onclick: () => captureAllMissing(tab) }, `Cattura mancanti (${missing})`)));
  if (!sites.length) view.append(h('div', { class: 'empty' }, 'Nessun sito salvato.'));
  view.append(h('div', { class: 'site-grid' }, sites.map((s) => siteCard(s))));
}

// --- TODO
function todoRow(t, rerender) {
  return h('div', { class: 'todo' + (t.done ? ' done' : '') },
    h('input', { type: 'checkbox', checked: t.done, onchange: (e) => { t.done = e.target.checked; save(); rerender(); } }),
    h('span', { class: 't' }, t.text),
    h('button', { class: 'icon', title: 'Elimina', onclick: () => { state.todos = state.todos.filter((x) => x.id !== t.id); save(); rerender(); } }, icon('xmark')));
}
function renderTodos(view) {
  const input = h('input', { type: 'text', placeholder: 'Nuova attività… (Invio per aggiungere)',
    onkeydown: (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        state.todos.unshift({ id: uid(), text: e.target.value.trim(), done: false });
        save(); render(); $('#view input[type=text]').focus();
      }
    } });
  view.append(h('div', { class: 'row', style: 'margin-bottom:14px' }, input));

  const active = state.todos.filter((t) => !t.done);
  const archived = state.todos.filter((t) => t.done);

  const list = h('div', { class: 'card' });
  if (!active.length) list.append(h('div', { class: 'empty' }, 'Nessuna attività.'));
  for (const t of active) list.append(todoRow(t, render));
  view.append(list);

  view.append(h('div', { class: 'row', style: 'margin:26px 0 10px; justify-content:space-between; align-items:baseline' },
    h('div', { class: 'section-title', style: 'margin:0' }, `Archivio (${archived.length})`),
    archived.length > 0 && h('div', { class: 'row', style: 'gap:8px' },
      h('button', { class: 'ghost small', onclick: () => { todoArchiveOpen = !todoArchiveOpen; render(); } }, todoArchiveOpen ? 'Nascondi' : 'Mostra'),
      todoArchiveOpen && h('button', { class: 'ghost small', onclick: () => { state.todos = state.todos.filter((t) => !t.done); save(); render(); } }, 'Vuota archivio'))));

  if (archived.length && todoArchiveOpen) {
    const archiveList = h('div', { class: 'card' });
    for (const t of archived) archiveList.append(todoRow(t, render));
    view.append(archiveList);
  } else if (!archived.length) {
    view.append(h('div', { class: 'empty' }, 'Nessuna attività completata.'));
  }
}

// --- NOTE
function renderNotes(view) {
  const ta = h('textarea', { style: 'min-height:60vh', placeholder: 'Appunti veloci… vengono salvati automaticamente.',
    oninput: (e) => { state.notes = e.target.value; save(); } });
  ta.value = state.notes || '';
  view.append(ta);
}

// --- APPUNTI
const todayISO = () => new Date().toISOString().slice(0, 10);
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}
// Salvataggio automatico dell'appunto aperto: ogni 30 secondi e uscendo dalla sezione
const APPUNTO_AUTOSAVE_MS = 30 * 1000;
let appuntoAutosaveTimer = null;
let flushAppunto = null;

function stopAppuntoAutosave() {
  clearInterval(appuntoAutosaveTimer);
  appuntoAutosaveTimer = null;
  flushAppunto = null;
}

// a = appunto mio (in state.appunti) o ricevuto da un collega (received: copia online, si salva sul server)
function appuntoForm(a, received = false) {
  // Un ridisegno ricrea il modulo: prima si salva quanto scritto in quello precedente
  if (flushAppunto) flushAppunto();
  stopAppuntoAutosave();
  const titleInput = h('input', { type: 'text', value: a?.title || '', placeholder: 'Es. Riunione cliente' });
  const dateInput = h('input', { type: 'date', value: a?.date || todayISO() });
  const rte = richTextInput(received ? sanitizeHtml(a.html) : a?.html || '');
  const content = rte.querySelector('.rte-content');
  const status = h('span', { class: 'sheet-status' });
  const read = () => ({ title: titleInput.value.trim(), date: dateInput.value || todayISO(), html: content.innerHTML.trim() });
  let lastSaved = JSON.stringify(read());
  const close = () => { stopAppuntoAutosave(); appuntoFormFor = null; render(); };

  // Senza titolo si salva come "Senza titolo"; un appunto nuovo e vuoto non si salva
  const autosave = () => {
    const v = read();
    const snapshot = JSON.stringify(v);
    if (snapshot === lastSaved || (!a && !v.title && !content.textContent.trim())) return;
    lastSaved = snapshot;
    const data = { ...v, title: v.title || 'Senza titolo' };
    if (received) saveReceivedNote(a, data, close);
    else {
      if (a) Object.assign(a, data);
      else {
        a = { id: uid(), ...data };
        state.appunti.push(a);
        if (appuntoFormFor === 'new') appuntoFormFor = a.id; // da qui in poi il modulo modifica l'appunto appena creato
      }
      save();
      if (a.sharedWith?.length) pushSharedNote(a);
    }
    status.textContent = `Salvato automaticamente alle ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    cancelBtn.textContent = 'Chiudi'; // le modifiche sono già salvate: non c'è più niente da annullare
  };

  const cancelBtn = h('button', { type: 'button', class: 'ghost', onclick: close }, 'Annulla');
  const saveBtn = h('button', { type: 'button', class: 'primary', onclick: () => {
    const v = read();
    if (!v.title) return titleInput.focus();
    const changed = lastSaved !== JSON.stringify(v);
    stopAppuntoAutosave();
    appuntoFormFor = null;
    if (received) {
      if (changed) saveReceivedNote(a, v);
      return render();
    }
    if (a) Object.assign(a, v);
    else state.appunti.push({ id: uid(), ...v });
    if (a?.sharedWith?.length && changed) pushSharedNote(a);
    save(); render();
  } }, 'Salva');
  const form = h('div', { class: 'card appunto-form' },
    received && h('div', { class: 'hint', style: 'margin:0 0 10px' }, 'Appunto di ', ownerTag(a.owner, ownerName(a)), ': le modifiche le vedono anche gli altri.'),
    h('label', { class: 'field' }, h('span', null, 'Titolo'), titleInput),
    h('label', { class: 'field' }, h('span', null, 'Data'), dateInput),
    // div e non label: un label inoltra i clic al primo pulsante della toolbar (Grassetto)
    h('div', { class: 'field' }, h('span', null, 'Testo'), rte),
    h('div', { class: 'modal-actions', style: 'align-items:center' }, status, h('span', { style: 'flex:1' }), cancelBtn, saveBtn));

  flushAppunto = autosave;
  appuntoAutosaveTimer = setInterval(() => {
    if (form.isConnected) autosave();
    else stopAppuntoAutosave();
  }, APPUNTO_AUTOSAVE_MS);
  return form;
}

function renderAppunti(view) {
  const connected = cloudState.connected && cloudState.user;
  if (connected && teamList === null) loadTeam();
  const me = connected ? cloudState.user.email : '';
  const received = connected ? (cloudState.sharedNotes || []).filter((n) => n.owner !== me && !n.deleted) : [];
  // Appunti nuovi ricevuti: evidenziati finché si resta nella sezione
  if (cloudState.unseenNotes?.length) {
    cloudState.unseenNotes.forEach((k) => notesHighlight.add(k));
    cloudState.unseenNotes = [];
    window.api.cloudNotesSeen();
  }
  const anyShared = received.length > 0 || state.appunti.some((a) => a.sharedWith?.length);
  if (!anyShared) appuntiFilter = 'all';
  view.append(h('div', { class: 'row', style: 'margin-bottom:14px; align-items:center; flex-wrap:wrap' },
    h('button', { class: 'primary', onclick: () => { appuntoFormFor = appuntoFormFor === 'new' ? null : 'new'; render(); } },
      appuntoFormFor === 'new' ? 'Annulla' : '+ Nuovo appunto'),
    anyShared && h('div', { class: 'chips', style: 'margin:0 0 0 auto' }, [['all', 'Tutti'], ['mine', 'Miei'], ['shared', 'Condivisi con me']].map(([id, label]) =>
      h('button', { class: 'chip' + (appuntiFilter === id ? ' active' : ''), onclick: () => { appuntiFilter = id; render(); } }, label)))));
  if (appuntoFormFor === 'new') view.append(appuntoForm(null));
  const list = [
    ...(appuntiFilter === 'shared' ? [] : state.appunti.map((a) => ({ a, mine: true }))),
    ...(appuntiFilter === 'mine' ? [] : received.map((a) => ({ a, mine: false }))),
  ].sort((x, y) => (y.a.date || '').localeCompare(x.a.date || ''));
  if (!list.length && appuntoFormFor !== 'new') view.append(h('div', { class: 'empty' },
    appuntiFilter === 'shared' ? 'Nessun appunto condiviso con te.' : 'Nessun appunto.'));
  for (const { a, mine } of list) {
    if (appuntoFormFor === (mine ? a.id : noteKey(a))) { view.append(appuntoForm(a, !mine)); continue; }
    view.append(mine ? appuntoCard(a, connected) : sharedAppuntoCard(a));
  }
}

function appuntoCard(a, connected) {
  const body = h('div', { class: 'appunto-body' });
  body.innerHTML = a.html || '';
  const tasks = a.asanaTasks || [];
  const shared = a.sharedWith || [];
  const me = cloudState.user?.email || '';
  const editedBy = shared.length > 0 && a.sharedUpdatedBy && a.sharedUpdatedBy !== me ? a.sharedUpdatedBy : '';
  return h('div', { class: 'card appunto' },
    h('div', { class: 'card-head' },
      h('div', { style: 'flex:1; min-width:0' },
        h('h3', null, a.title,
          shared.length > 0 && ownerTag(me, 'Tu'),
          a.keptFrom && ownerTag(a.keptFrom.email, a.keptFrom.name)),
        h('div', { class: 'sub' }, formatDate(a.date),
          shared.length > 0 && ` · condiviso con ${shared.map(personName).join(', ')}`,
          editedBy && ` · modificato da ${personName(editedBy)}`,
          a.keptFrom && ' · eliminato dal proprietario: questa è la tua copia')),
      connected && h('button', { class: 'ghost small', title: 'Condividi con i colleghi', onclick: () => shareDialog(a) },
        icon('share-nodes'), shared.length ? ' Condiviso' : ' Condividi'),
      asanaState.connected && h('button', { class: 'ghost small', title: 'Crea un task su Asana da questo appunto',
        onclick: () => asanaTaskDialog(a) }, icon('list-check'), ' Task Asana'),
      editing && h('button', { class: 'icon', title: 'Modifica', onclick: () => { appuntoFormFor = a.id; render(); } }, icon('pen')),
      editing && h('button', { class: 'icon', title: 'Elimina', onclick: () => confirmBox(
        shared.length ? `Eliminare "${a.title}"? I colleghi con cui è condiviso ne tengono una copia.` : `Eliminare "${a.title}"?`, () => {
          state.appunti = state.appunti.filter((x) => x.id !== a.id);
          if (shared.length) unshareNote(a.id);
          save(); render();
        }) }, icon('xmark'))),
    body,
    tasks.length > 0 && h('div', { class: 'appunto-tasks' }, tasks.map((t) =>
      h('button', { class: 'chip', title: 'Apri su Asana', onclick: () => window.api.openExternal(t.url) },
        icon('list-check'), ' ', t.name, t.project && h('span', { class: 'appunto-task-project' }, ' · ' + t.project)))));
}

// Appunto di un collega: modificabile, con il nome del proprietario
function sharedAppuntoCard(n) {
  const body = h('div', { class: 'appunto-body' });
  body.innerHTML = sanitizeHtml(n.html);
  const editedBy = n.updatedBy && n.updatedBy !== n.owner ? n.updatedByName || personName(n.updatedBy) : '';
  return h('div', { class: 'card appunto' },
    h('div', { class: 'card-head' },
      h('div', { style: 'flex:1; min-width:0' },
        h('h3', null, n.title, ownerTag(n.owner, ownerName(n)), notesHighlight.has(noteKey(n)) && h('span', { class: 'new-tag' }, 'Nuovo')),
        h('div', { class: 'sub' }, formatDate(n.date), ' · condiviso con te', editedBy && ` · modificato da ${editedBy}`)),
      editing && h('button', { class: 'icon', title: 'Modifica', onclick: () => { appuntoFormFor = noteKey(n); render(); } }, icon('pen')),
      editing && h('button', { class: 'icon', title: 'Togli dalla mia lista', onclick: () => confirmBox(
        `Togliere "${n.title}" dalla tua lista? Non lo vedrai più; resta a ${ownerName(n)}.`, async () => {
          const res = await window.api.cloudDeleteNote(n.owner, n.id);
          toast(res.ok ? 'Appunto tolto dalla tua lista' : res.error);
        }, 'Togli') }, icon('xmark'))),
    body);
}

// --- Appunti condivisi con i colleghi (account Solferino 3). La copia online è quella di riferimento:
// tutti possono modificarla; la revisione (rev) evita di sovrascrivere le modifiche di un altro,
// e in caso di conflitto la propria versione si salva come appunto a parte.
// Il proprietario tiene l'appunto anche nei suoi dati (state.appunti) e ci riporta le modifiche dei colleghi;
// se lo elimina, chi l'ha ricevuto ne salva una copia nei propri appunti.
let teamList = null; // [{ email, name }], null = da caricare
let appuntiFilter = 'all'; // all | mine | shared
let notesHighlight = new Set(); // appunti ricevuti segnati "Nuovo" finché si resta nella sezione
let retryingShares = false;
const keepingNotes = new Set();

const noteKey = (n) => `${n.owner}/${n.id}`;

async function loadTeam() {
  teamList = [];
  const res = await window.api.cloudTeam();
  teamList = res.ok ? res.result : null;
  if (res.ok && page === 'appunti' && !appuntoFormFor) render();
  return res;
}

const personName = (email) => teamList?.find((u) => u.email === email)?.name || email.split('@')[0];
const ownerName = (n) => n.ownerName || personName(n.owner);
const ownerTag = (email, name) => h('span', { class: 'project-tag', style: `--tag:${colorFor(email)}`, title: email }, icon('user'), ' ', name);
const sharedContent = (n) => ({ title: n.title, date: n.date, html: sanitizeHtml(n.html) });
const timeNow = () => new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

// In conflitto vince la versione online: quella scritta qui diventa un appunto mio a parte
function keepMyVersion(v, n) {
  state.appunti.push({ id: uid(), ...v, title: `${v.title} (tua versione delle ${timeNow()})` });
  save();
  toast(`${n.updatedByName || personName(n.updatedBy)} ha modificato l'appunto nel frattempo: la tua versione è salvata a parte`);
}

async function pushSharedNote(a) {
  const res = await window.api.cloudSaveNote({ owner: cloudState.user.email, id: a.id, title: a.title, date: a.date, html: a.html,
    sharedWith: a.sharedWith || [], baseRev: a.sharedRev || 0 });
  // Nel frattempo i dati possono essere stati ricaricati: si aggiorna l'appunto attuale con lo stesso id
  const cur = state.appunti.find((x) => x.id === a.id);
  if (!cur) return res;
  if (res.ok || res.conflict) {
    delete cur.shareDirty;
    if (res.conflict) {
      keepMyVersion({ title: cur.title, date: cur.date, html: cur.html }, res.note);
      Object.assign(cur, sharedContent(res.note));
      if (appuntoFormFor === cur.id) appuntoFormFor = null;
    }
    applySharedMeta(cur, res.note);
    if (!appuntoFormFor && page === 'appunti') render(); // con il modulo aperto si ridisegnerebbe mentre si scrive
  } else cur.shareDirty = true;
  save();
  return res;
}

function applySharedMeta(a, n) {
  if (n) Object.assign(a, { sharedWith: n.sharedWith, sharedRev: n.rev, sharedUpdatedBy: n.updatedBy });
  else ['sharedWith', 'sharedRev', 'sharedUpdatedBy'].forEach((k) => delete a[k]);
}

// Modifica di un appunto ricevuto: va direttamente online
async function saveReceivedNote(n, v, onConflict) {
  const res = await window.api.cloudSaveNote({ owner: n.owner, id: n.id, ...v, baseRev: n.rev });
  if (res.ok) return Object.assign(n, res.note); // il modulo aperto continua dalla nuova revisione
  if (res.conflict) {
    keepMyVersion(v, res.note);
    if (onConflict) onConflict();
    else render();
  } else toast(res.error);
}

async function unshareNote(id) {
  const res = await window.api.cloudDeleteNote(cloudState.user.email, id);
  if (!res.ok && !state.unshareQueue.includes(id)) { state.unshareQueue.push(id); save(); }
  return res;
}

// Dopo ogni sincronizzazione: modifiche dei colleghi ai miei appunti, copie di quelli eliminati, invii non riusciti
async function syncSharedNotes() {
  if (retryingShares || !cloudState.connected || !cloudState.user || cloudState.error) return;
  retryingShares = true;
  try {
    const me = cloudState.user.email;
    let changed = false;
    for (const n of cloudState.sharedNotes || []) {
      if (n.owner === me) {
        const a = state.appunti.find((x) => x.id === n.id);
        if (!a || a.shareDirty || appuntoFormFor === a.id || n.rev <= (a.sharedRev || 0)) continue;
        Object.assign(a, sharedContent(n));
        applySharedMeta(a, n);
        changed = true;
      } else if (n.deleted && !keepingNotes.has(noteKey(n))) {
        keepingNotes.add(noteKey(n));
        const id = `kept-${n.id}-${hueFrom(n.owner)}`;
        if (!state.appunti.some((x) => x.id === id)) {
          state.appunti.push({ id, ...sharedContent(n), keptFrom: { email: n.owner, name: ownerName(n) } });
          save();
          changed = true;
          toast(`${ownerName(n)} ha eliminato "${n.title}": la copia resta nei tuoi appunti`);
        }
        await window.api.cloudDeleteNote(n.owner, n.id); // copia salvata: il server può dimenticarlo
        keepingNotes.delete(noteKey(n));
      }
    }
    if (changed) {
      save();
      if (page === 'appunti' && !appuntoFormFor) render();
    }
    for (const a of state.appunti.filter((x) => x.shareDirty)) await pushSharedNote(a);
    for (const id of [...state.unshareQueue]) {
      const res = await window.api.cloudDeleteNote(me, id);
      if (res.ok) { state.unshareQueue = state.unshareQueue.filter((x) => x !== id); save(); }
    }
  } finally {
    retryingShares = false;
  }
}

async function shareDialog(a) {
  if (!teamList?.length) {
    const res = await loadTeam();
    if (!res.ok) return toast(res.error);
  }
  const me = cloudState.user.email;
  const people = teamList.filter((u) => u.email !== me);
  if (!people.length) return toast('Non ci sono altri colleghi nell\'account');
  const chosen = new Set(a.sharedWith || []);
  const boxes = people.map((u) => h('input', { type: 'checkbox', checked: chosen.has(u.email),
    onchange: (e) => { e.target.checked ? chosen.add(u.email) : chosen.delete(u.email); } }));
  const dlg = $('#modal');
  const okBtn = h('button', { type: 'submit', class: 'primary' }, 'Condividi');
  const form = h('form', { method: 'dialog' },
    h('h2', null, 'Condividi appunto'),
    h('p', { class: 'hint' }, `I colleghi scelti ricevono una notifica e possono leggere e modificare "${a.title}"; le modifiche le vedete tutti. `
      + 'Se lo elimini ne tengono una copia; togliendo la spunta a qualcuno, invece, non lo vede più.'),
    h('div', { style: 'max-height:50vh; overflow:auto' }, people.map((u, i) => h('label', { class: 'tool-toggle' },
      boxes[i], h('span', null, u.name || u.email), u.name && h('span', { class: 'tool-note' }, u.email)))),
    h('div', { class: 'modal-actions' },
      h('button', { type: 'button', class: 'ghost', style: 'margin-right:auto', onclick: () => {
        const all = boxes.some((b) => !b.checked);
        boxes.forEach((b, i) => { b.checked = all; all ? chosen.add(people[i].email) : chosen.delete(people[i].email); });
      } }, 'Tutti / nessuno'),
      h('button', { type: 'button', class: 'ghost', onclick: () => dlg.close() }, 'Annulla'), okBtn));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const before = a.sharedWith || [];
    const list = [...chosen];
    if (!list.length && !before.length) return dlg.close();
    okBtn.disabled = true;
    okBtn.textContent = 'Condivisione…';
    a.sharedWith = list;
    const res = await pushSharedNote(a);
    okBtn.disabled = false;
    okBtn.textContent = 'Condividi';
    if (!res.ok) {
      // Niente da riprovare: si torna alla condivisione di prima
      const cur = state.appunti.find((x) => x.id === a.id);
      if (cur && !res.conflict) { cur.sharedWith = before; if (!before.length) delete cur.sharedWith; delete cur.shareDirty; save(); }
      return toast(res.error);
    }
    if (!res.note) applySharedMeta(a, null);
    save();
    dlg.close();
    render();
    toast(list.length ? `Condiviso con ${list.map(personName).join(', ')}` : 'Appunto non più condiviso');
  });
  dlg.replaceChildren(form);
  dlg.showModal();
}

// HTML degli appunti dei colleghi: solo la formattazione dell'editor, senza attributi
const SAFE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'UL', 'OL', 'LI', 'BR', 'DIV', 'P', 'SPAN', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const clean = (node) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === Node.TEXT_NODE) continue;
      if (n.nodeType !== Node.ELEMENT_NODE || /^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|TEMPLATE|svg|math)$/i.test(n.tagName)) { n.remove(); continue; }
      clean(n);
      if (SAFE_TAGS.has(n.tagName)) [...n.attributes].forEach((at) => n.removeAttribute(at.name));
      else n.replaceWith(...n.childNodes);
    }
  };
  clean(doc.body);
  return doc.body.innerHTML;
}

// --- Task Asana da un appunto: nome, descrizione (il testo dell'appunto), progetto, persona e scadenza
// Testo semplice dall'HTML dell'appunto, con gli elenchi puntati e numerati (DOMParser: niente script o immagini caricati)
function htmlToText(html) {
  const lines = [];
  let line = '';
  const flush = () => {
    if (line.trim()) lines.push(line.trim());
    line = '';
  };
  const walk = (node) => {
    for (const n of node.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) line += n.textContent;
      else if (n.nodeType !== Node.ELEMENT_NODE) continue;
      else if (n.tagName === 'BR') flush();
      else if (n.tagName === 'UL' || n.tagName === 'OL') {
        flush();
        [...n.children].forEach((li, i) => {
          line = n.tagName === 'OL' ? `${i + 1}. ` : '• ';
          walk(li);
          flush();
        });
      } else {
        const block = /^(DIV|P|H[1-6]|LI|BLOCKQUOTE|PRE)$/.test(n.tagName);
        if (block) flush();
        walk(n);
        if (block) flush();
      }
    }
  };
  walk(new DOMParser().parseFromString(html || '', 'text/html').body);
  flush();
  return lines.join('\n');
}

let lastAsanaTaskProject = ''; // il prossimo task propone lo stesso progetto

function asanaTaskDialog(a) {
  const dlg = $('#modal');
  dlg.innerHTML = '';
  // Prima i preferiti (nell'ordine di Asana), poi gli altri in ordine alfabetico
  const projects = [...asanaState.projects].sort((x, y) => (x.favorite < 0) - (y.favorite < 0)
    || (x.favorite >= 0 ? x.favorite - y.favorite : x.name.trim().localeCompare(y.name.trim(), 'it')));
  const manyWorkspaces = new Set(projects.map((p) => p.workspace)).size > 1;
  const nameInput = h('input', { type: 'text', value: a.title === 'Senza titolo' ? '' : a.title, placeholder: 'Cosa c\'è da fare' });
  const notesInput = h('textarea', { rows: 6, value: htmlToText(a.html) });
  const projectSelect = h('select', null,
    h('option', { value: '' }, projects.length ? 'Scegli un progetto…' : 'Nessun progetto: aggiorna la sezione Asana'),
    projects.map((p) => h('option', { value: p.gid, selected: p.gid === lastAsanaTaskProject },
      manyWorkspaces ? `${p.name} · ${p.workspace}` : p.name)));
  const userSelect = h('select', { disabled: true }, h('option', { value: '' }, 'Scegli prima il progetto'));
  const dueInput = h('input', { type: 'date' });
  const error = h('div', { class: 'sheet-status error' });

  let usersFor = '';
  const loadUsers = async () => {
    const project = projectSelect.value;
    usersFor = project;
    userSelect.disabled = true;
    if (!project) return userSelect.replaceChildren(h('option', { value: '' }, 'Scegli prima il progetto'));
    userSelect.replaceChildren(h('option', { value: '' }, 'Caricamento persone…'));
    const res = await window.api.asanaUsers(project);
    if (usersFor !== project) return; // nel frattempo è stato scelto un altro progetto
    if (!res.ok) {
      error.textContent = res.error;
      return userSelect.replaceChildren(h('option', { value: '' }, '— Nessuno —'));
    }
    const me = res.users.find((u) => u.gid === res.me);
    userSelect.replaceChildren(
      h('option', { value: '' }, '— Nessuno —'),
      ...(me ? [h('option', { value: me.gid, selected: true }, `Io (${me.name})`)] : []),
      ...res.users.filter((u) => u !== me).map((u) => h('option', { value: u.gid, title: u.email }, u.name)));
    userSelect.disabled = false;
  };
  projectSelect.addEventListener('change', () => {
    error.textContent = '';
    loadUsers();
  });

  const createBtn = h('button', { type: 'submit', class: 'primary' }, 'Crea task');
  const form = h('form', { method: 'dialog' }, h('h2', null, 'Nuovo task Asana'),
    h('label', { class: 'field' }, h('span', null, 'Nome del task'), nameInput),
    h('label', { class: 'field' }, h('span', null, 'Progetto'), projectSelect),
    h('div', { class: 'two' },
      h('label', { class: 'field' }, h('span', null, 'Assegna a'), userSelect),
      h('label', { class: 'field' }, h('span', null, 'Scadenza'), dueInput)),
    h('label', { class: 'field' }, h('span', null, 'Descrizione'), notesInput),
    error,
    h('div', { class: 'modal-actions' }, h('button', { type: 'button', class: 'ghost', onclick: () => dlg.close() }, 'Annulla'), createBtn));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.textContent = '';
    const name = nameInput.value.trim();
    if (!name) return nameInput.focus();
    if (!projectSelect.value) return projectSelect.focus();
    createBtn.disabled = true;
    createBtn.textContent = 'Creazione…';
    const res = await window.api.asanaCreateTask({ name, notes: notesInput.value.trim(), project: projectSelect.value,
      assignee: userSelect.disabled ? '' : userSelect.value, due: dueInput.value });
    createBtn.disabled = false;
    createBtn.textContent = 'Crea task';
    if (!res.ok) {
      error.textContent = res.error;
      return;
    }
    lastAsanaTaskProject = projectSelect.value;
    const project = projects.find((p) => p.gid === projectSelect.value);
    a.asanaTasks = [...(a.asanaTasks || []), { gid: res.gid, url: res.url, name, project: project?.name || '' }];
    save();
    dlg.close();
    toast('Task creato su Asana');
    render();
  });
  dlg.append(form);
  dlg.showModal();
  nameInput.focus();
  if (projectSelect.value) loadUsers();
}

// --- UTM
const utmState = { url: '', source: '', medium: '', campaign: '', term: '', content: '' };
const UTM_PRESETS = [
  ['facebook', 'paid_social'], ['instagram', 'paid_social'], ['google', 'cpc'],
  ['newsletter', 'email'], ['linkedin', 'paid_social'], ['instagram', 'social'],
];
function buildUtm() {
  const u = normalizeUrl(utmState.url);
  if (!u) return '';
  try {
    const url = new URL(u);
    for (const k of ['source', 'medium', 'campaign', 'term', 'content']) {
      const v = utmState[k].trim().toLowerCase().replace(/\s+/g, '_');
      if (v) url.searchParams.set('utm_' + k, v);
    }
    return url.toString();
  } catch (_) { return ''; }
}
function renderUtm(view) {
  const out = h('div', { class: 'output' });
  const upd = () => { const r = buildUtm(); out.textContent = r || 'Inserisci almeno l\'URL di destinazione.'; return r; };
  const field = (key, label, ph) => h('label', { class: 'field' }, h('span', null, label),
    h('input', { type: 'text', placeholder: ph, value: utmState[key], id: 'utm-' + key,
      oninput: (e) => { utmState[key] = e.target.value; upd(); } }));
  view.append(h('div', { class: 'card' },
    field('url', 'URL di destinazione', 'https://www.sito.it/pagina'),
    h('div', { class: 'section-title', style: 'margin-top:4px' }, 'Preset sorgente / mezzo'),
    h('div', { class: 'chips' }, UTM_PRESETS.map(([s, m]) => h('button', { class: 'chip', onclick: () => {
      utmState.source = s; utmState.medium = m;
      $('#utm-source').value = s; $('#utm-medium').value = m; upd();
    } }, `${s} / ${m}`))),
    h('div', { class: 'two' }, field('source', 'utm_source', 'facebook'), field('medium', 'utm_medium', 'paid_social')),
    field('campaign', 'utm_campaign', 'saldi_autunno_2026'),
    h('div', { class: 'two' }, field('term', 'utm_term (opzionale)', ''), field('content', 'utm_content (opzionale)', 'video_a')),
    out,
    h('div', { class: 'row', style: 'margin-top:12px' },
      h('button', { class: 'primary', onclick: () => { const r = upd(); if (r) copy(r, 'URL copiato'); } }, 'Copia URL'),
      h('button', { class: 'ghost', onclick: () => { Object.keys(utmState).forEach((k) => (utmState[k] = '')); render(); } }, 'Azzera'))));
  upd();
}

// --- SNIPPET
function snippetFields(s = {}) {
  return [
    { name: 'title', label: 'Titolo', value: s.title || '', placeholder: 'Es. Risposta preventivo' },
    { name: 'text', label: 'Testo', type: 'textarea', value: s.text || '', rows: 8 },
  ];
}
function renderSnippets(view) {
  view.append(h('div', { class: 'row', style: 'margin-bottom:14px' },
    h('button', { class: 'primary', onclick: () => openForm({ title: 'Nuovo snippet', fields: snippetFields(),
      onSubmit: (v) => {
        if (!v.title || !v.text) return false;
        state.snippets.push({ id: uid(), title: v.title, text: v.text }); save(); render();
      } }) }, '+ Nuovo snippet')));
  if (!state.snippets.length) view.append(h('div', { class: 'empty' }, 'Nessuno snippet.'));
  for (const s of state.snippets) {
    view.append(h('div', { class: 'card snippet' },
      h('div', { class: 'card-head' },
        h('h3', null, s.title),
        h('button', { class: 'ghost small', onclick: () => copy(s.text) }, 'Copia'),
        editing && h('button', { class: 'icon', title: 'Modifica', onclick: () => openForm({ title: 'Modifica snippet', fields: snippetFields(s),
          onSubmit: (v) => { if (!v.title || !v.text) return false; s.title = v.title; s.text = v.text; save(); render(); } }) }, icon('pen')),
        editing && h('button', { class: 'icon', title: 'Elimina', onclick: () => confirmBox(`Eliminare "${s.title}"?`, () => {
          state.snippets = state.snippets.filter((x) => x.id !== s.id); save(); render();
        }) }, icon('xmark'))),
      h('pre', null, s.text)));
  }
}

// ---------- Sezioni dei profili ----------
// Ogni sezione è una lista di schede con campi propri. Gli stati sono in ordine:
// un clic sullo stato passa al successivo; i toni 'done' e 'ko' indicano una scheda chiusa.
const st = (label, tone) => ({ label, tone });
const RECORD_TYPES = {
  calendario: {
    singular: 'contenuto', addLabel: 'Nuovo contenuto', empty: 'Nessun contenuto in calendario.',
    titleField: 'title', dateField: 'date', groupBy: 'month', upcoming: true,
    meta: ['channel', 'format', 'client'],
    fields: [
      { name: 'date', label: 'Data di pubblicazione', type: 'date', required: true },
      { name: 'title', label: 'Titolo o tema', required: true, placeholder: 'Es. Lancio collezione autunno' },
      { name: 'client', label: 'Cliente' },
      { name: 'channel', label: 'Canale', type: 'select', options: ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'YouTube', 'Newsletter', 'Altro'] },
      { name: 'format', label: 'Formato', type: 'select', options: ['Post', 'Carosello', 'Reel', 'Story', 'Video', 'Articolo'] },
      { name: 'status', label: 'Stato', type: 'status' },
      { name: 'notes', label: 'Note', type: 'textarea' },
    ],
    statuses: [st('Idea', 'neutral'), st('In lavorazione', 'progress'), st('Programmato', 'info'), st('Pubblicato', 'done')],
  },
  font: {
    singular: 'font', addLabel: 'Nuovo font', empty: 'Nessun font salvato.',
    titleField: 'name', groupBy: 'category', urlField: 'url', meta: ['client'],
    titleStyle: (r) => `font-family: "${r.name.replace(/["\\]/g, '')}", var(--font)`, // anteprima se il font è installato
    fields: [
      { name: 'name', label: 'Nome del font', required: true, placeholder: 'Es. Inter' },
      { name: 'category', label: 'Categoria', type: 'select', options: ['Sans-serif', 'Serif', 'Display', 'Script', 'Monospace'] },
      { name: 'url', label: 'Link (Google Fonts, Adobe Fonts, file…)', type: 'url', placeholder: 'https://…' },
      { name: 'client', label: 'Cliente o progetto' },
      { name: 'notes', label: 'Uso e abbinamenti', type: 'textarea' },
    ],
  },
  shooting: {
    singular: 'shooting', addLabel: 'Nuovo shooting', empty: 'Nessuno shooting.',
    titleField: 'title', dateField: 'date', groupBy: 'month', upcoming: true,
    meta: ['client', 'location', 'kind'],
    fields: [
      { name: 'date', label: 'Data', type: 'date', required: true },
      { name: 'title', label: 'Titolo', required: true, placeholder: 'Es. Still life collezione autunno' },
      { name: 'client', label: 'Cliente' },
      { name: 'location', label: 'Location', placeholder: 'Es. Studio, esterno, indirizzo…' },
      { name: 'kind', label: 'Tipo', type: 'select', options: ['Prodotto', 'Ritratto', 'Evento', 'Food', 'Moda', 'Architettura', 'Altro'] },
      { name: 'status', label: 'Stato', type: 'status' },
      { name: 'notes', label: 'Note (attrezzatura, shot list…)', type: 'textarea' },
    ],
    statuses: [st('Da organizzare', 'neutral'), st('Confermato', 'info'), st('Scattato', 'progress'),
      st('In post-produzione', 'progress'), st('Consegnato', 'done')],
  },
  lead: {
    singular: 'lead', addLabel: 'Nuovo lead', empty: 'Nessun lead.',
    titleField: 'name', dateField: 'next', groupBy: 'status', amountField: 'value', upcoming: true,
    meta: ['company', 'contact', 'source'],
    fields: [
      { name: 'name', label: 'Nome', required: true, placeholder: 'Es. Mario Rossi' },
      { name: 'company', label: 'Azienda' },
      { name: 'contact', label: 'Email o telefono' },
      { name: 'source', label: 'Provenienza', type: 'select', options: ['Passaparola', 'Sito web', 'Social', 'Evento', 'Chiamata', 'Altro'] },
      { name: 'value', label: 'Valore stimato (€)', type: 'number' },
      { name: 'next', label: 'Prossimo contatto', type: 'date' },
      { name: 'status', label: 'Stato', type: 'status' },
      { name: 'notes', label: 'Note', type: 'textarea' },
    ],
    statuses: [st('Nuovo', 'neutral'), st('Contattato', 'info'), st('In trattativa', 'progress'), st('Vinto', 'done'), st('Perso', 'ko')],
  },
  preventivi: {
    singular: 'preventivo', addLabel: 'Nuovo preventivo', empty: 'Nessun preventivo.',
    titleField: 'title', dateField: 'date', groupBy: 'status', amountField: 'amount',
    meta: ['client'],
    fields: [
      { name: 'date', label: 'Data', type: 'date', required: true },
      { name: 'title', label: 'Oggetto', required: true, placeholder: 'Es. Gestione social 2027' },
      { name: 'client', label: 'Cliente', required: true },
      { name: 'amount', label: 'Importo (€)', type: 'number' },
      { name: 'status', label: 'Stato', type: 'status' },
      { name: 'notes', label: 'Note', type: 'textarea' },
    ],
    statuses: [st('Bozza', 'neutral'), st('Inviato', 'info'), st('Accettato', 'done'), st('Rifiutato', 'ko')],
  },
  progetti: {
    singular: 'progetto', addLabel: 'Nuovo progetto', empty: 'Nessun progetto.',
    titleField: 'name', dateField: 'deadline', groupBy: 'status', upcoming: true,
    meta: ['client'],
    fields: [
      { name: 'name', label: 'Nome del progetto', required: true, placeholder: 'Es. Restyling sito' },
      { name: 'client', label: 'Cliente' },
      { name: 'deadline', label: 'Consegna', type: 'date' },
      { name: 'status', label: 'Stato', type: 'status' },
      { name: 'notes', label: 'Note', type: 'textarea' },
    ],
    statuses: [st('Da iniziare', 'neutral'), st('In corso', 'progress'), st('In revisione', 'info'), st('Completato', 'done')],
  },
  scadenze: {
    singular: 'scadenza', addLabel: 'Nuova scadenza', empty: 'Nessuna scadenza.',
    titleField: 'title', dateField: 'date', groupBy: 'month', upcoming: true,
    meta: ['project'],
    fields: [
      { name: 'date', label: 'Data', type: 'date', required: true },
      { name: 'title', label: 'Cosa', required: true, placeholder: 'Es. Consegna bozze' },
      { name: 'project', label: 'Progetto o cliente' },
      { name: 'status', label: 'Stato', type: 'status' },
      { name: 'notes', label: 'Note', type: 'textarea' },
    ],
    statuses: [st('Da fare', 'neutral'), st('In corso', 'progress'), st('Fatto', 'done')],
  },
  palette: {
    singular: 'palette', addLabel: 'Nuova palette', empty: 'Nessuna palette.',
    titleField: 'name',
    fields: [
      { name: 'name', label: 'Nome', required: true, placeholder: 'Es. Brand cliente' },
      { name: 'client', label: 'Cliente o progetto' },
      { name: 'colors', label: 'Colori (codici HEX separati da virgola o spazio)', type: 'textarea', required: true, rows: 3,
        placeholder: '#1d1d1b, #ea638c, #fcf2f5' },
    ],
    normalize: (r) => { r.colors = parseColors(r.colors); return r.colors.length > 0; },
  },
};
const RECORD_KEYS = Object.keys(RECORD_TYPES);

const isClosed = (status) => status && (status.tone === 'done' || status.tone === 'ko');
const statusOf = (type, r) => type.statuses && (type.statuses.find((s) => s.label === r.status) || type.statuses[0]);
const money = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
const formatMoney = (v) => (v === '' || v == null || isNaN(Number(v)) ? '' : money.format(Number(v)));
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function recordFields(type, r) {
  return type.fields.map((f) => {
    const out = { ...f };
    if (f.type === 'status') Object.assign(out, { type: 'select', options: type.statuses.map((s) => s.label) });
    else if (f.type === 'select') out.empty = true;
    const v = r ? r[f.name] : undefined;
    out.value = Array.isArray(v) ? v.join(', ')
      : v ?? (f.type === 'status' ? type.statuses[0].label : f.type === 'date' && f.required ? todayISO() : '');
    return out;
  });
}

function editRecord(key, r) {
  const type = RECORD_TYPES[key];
  openForm({ title: r ? `Modifica ${type.singular}` : type.addLabel, fields: recordFields(type, r),
    onSubmit: (v) => {
      if (type.fields.some((f) => f.required && !v[f.name])) return false;
      const next = { ...(r || { id: uid() }) };
      for (const f of type.fields) next[f.name] = f.type === 'url' && v[f.name] ? normalizeUrl(v[f.name]) : v[f.name];
      if (type.normalize && !type.normalize(next)) return false;
      if (r) Object.assign(r, next);
      else state[key].push(next);
      save(); render();
    } });
}

function deleteRecord(key, r) {
  const type = RECORD_TYPES[key];
  confirmBox(`Eliminare "${r[type.titleField]}"?`, () => {
    state[key] = state[key].filter((x) => x.id !== r.id); save(); render();
  });
}

function cycleStatus(type, r) {
  const i = type.statuses.findIndex((s) => s.label === r.status);
  r.status = type.statuses[(Math.max(i, 0) + 1) % type.statuses.length].label;
  save(); render();
}

function dateBlock(iso, overdue) {
  if (!iso) return h('div', { class: 'record-date' });
  const d = new Date(iso + 'T00:00:00');
  return h('div', { class: 'record-date' + (overdue ? ' overdue' : ''), title: formatDate(iso) },
    h('b', null, d.getDate()), h('span', null, d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '')));
}

function recordRow(key, r, { onOpen, showPage } = {}) {
  const type = RECORD_TYPES[key];
  const status = statusOf(type, r);
  const date = type.dateField && r[type.dateField];
  const overdue = date && date < todayISO() && !isClosed(status);
  const meta = [showPage && PROFILE_PAGES[key].label, ...(type.meta || []).map((n) => r[n])].filter(Boolean);
  const amount = type.amountField && formatMoney(r[type.amountField]);
  const url = type.urlField && r[type.urlField];
  return h('div', { class: 'record' + (isClosed(status) ? ' closed' : '') + (onOpen ? ' clickable' : ''),
    onclick: onOpen && ((e) => { if (!e.target.closest('button')) onOpen(); }) },
    type.dateField && dateBlock(date, overdue),
    h('div', { class: 'record-main' },
      h('div', { class: 'record-title', style: type.titleStyle ? type.titleStyle(r) : null }, r[type.titleField]),
      meta.length > 0 && h('div', { class: 'record-meta' }, meta.join(' · ')),
      !onOpen && r.notes && h('div', { class: 'record-notes' }, r.notes)),
    amount && h('div', { class: 'record-amount' }, amount),
    url && h('button', { class: 'ghost small', onclick: () => window.api.openExternal(url) }, 'Apri'),
    status && h('button', { class: `status tone-${status.tone}`, title: 'Clic per passare allo stato successivo',
      onclick: () => cycleStatus(type, r) }, status.label),
    !onOpen && editing && h('button', { class: 'icon', title: 'Modifica', onclick: () => editRecord(key, r) }, icon('pen')),
    !onOpen && editing && h('button', { class: 'icon', title: 'Elimina', onclick: () => deleteRecord(key, r) }, icon('xmark')));
}

const byDate = (field) => (a, b) => (a[field] || '9999').localeCompare(b[field] || '9999');

// Raggruppa le schede per mese, per stato o per il valore di un campo
function groupRecords(type, list) {
  if (type.groupBy === 'month') {
    const thisMonth = todayISO().slice(0, 7);
    const sorted = [...list].sort(byDate(type.dateField));
    const groups = new Map();
    const past = [];
    for (const r of sorted) {
      const ym = (r[type.dateField] || '').slice(0, 7);
      if (ym && ym < thisMonth) { past.push(r); continue; }
      const label = ym ? capitalize(new Date(ym + '-01T00:00:00').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })) : 'Senza data';
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(r);
    }
    const out = [...groups].map(([label, items]) => ({ label, items }));
    if (past.length) out.push({ label: 'Mesi precedenti', items: past.reverse(), collapsible: true });
    return out;
  }
  if (type.groupBy === 'status') {
    const sorted = type.dateField ? [...list].sort(byDate(type.dateField)) : list;
    return type.statuses.map((s) => ({ label: s.label, items: sorted.filter((r) => statusOf(type, r) === s) }))
      .filter((g) => g.items.length);
  }
  const field = type.fields.find((f) => f.name === type.groupBy);
  const order = [...(field.options || []), ...new Set(list.map((r) => r[type.groupBy]))];
  return [...new Set(order)].map((v) => ({ label: v || 'Altro', items: list.filter((r) => (r[type.groupBy] || '') === (v || '')) }))
    .filter((g) => g.items.length);
}

const openPastGroups = new Set(); // sezioni con "Mesi precedenti" aperto

function renderRecords(view, key) {
  const type = RECORD_TYPES[key];
  view.append(h('div', { class: 'row', style: 'margin-bottom:6px' },
    h('button', { class: 'primary', onclick: () => editRecord(key) }, `+ ${type.addLabel}`)));
  if (!state[key].length) { view.append(h('div', { class: 'empty' }, type.empty)); return; }
  for (const g of groupRecords(type, state[key])) {
    const total = type.amountField ? g.items.reduce((sum, r) => sum + (Number(r[type.amountField]) || 0), 0) : 0;
    const open = !g.collapsible || openPastGroups.has(key);
    view.append(h('div', { class: 'section-title group-title' },
      g.label, h('span', { class: 'sum' }, `${g.items.length}${total ? ' · ' + money.format(total) : ''}`),
      g.collapsible && h('button', { class: 'ghost small', onclick: () => {
        if (open) openPastGroups.delete(key); else openPastGroups.add(key);
        render();
      } }, open ? 'Nascondi' : 'Mostra')));
    if (open) view.append(h('div', { class: 'card records' }, g.items.map((r) => recordRow(key, r))));
  }
}

function upcomingRecords(keys, limit = 6) {
  const out = [];
  for (const key of keys) {
    const type = RECORD_TYPES[key];
    for (const r of state[key]) {
      if (r[type.dateField] && !isClosed(statusOf(type, r))) out.push({ key, r, date: r[type.dateField] });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}

// --- PALETTE COLORI (Grafico)
function parseColors(text) {
  const found = String(text || '').match(/#?\b(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi) || [];
  return [...new Set(found.map((c) => {
    c = c.replace('#', '').toLowerCase();
    return '#' + (c.length === 3 ? c.replace(/./g, '$&$&') : c);
  }))];
}
// Testo scuro o bianco, quello col contrasto maggiore (luminanza WCAG): su #6295A5 vince lo scuro, come sul sito
function readableOn(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (l + 0.05) / 0.05 > 1.05 / (l + 0.05) ? '#1d1d1b' : '#ffffff';
}
function renderPalette(view) {
  view.append(h('div', { class: 'row', style: 'margin-bottom:14px' },
    h('button', { class: 'primary', onclick: () => editRecord('palette') }, '+ Nuova palette')));
  if (!state.palette.length) { view.append(h('div', { class: 'empty' }, RECORD_TYPES.palette.empty)); return; }
  view.append(h('div', { class: 'palette-grid' }, state.palette.map((p) => h('div', { class: 'palette-card' },
    h('div', { class: 'palette-colors' }, p.colors.map((c) => h('button', {
      style: `background:${c}; color:${readableOn(c)}`, title: 'Copia ' + c, onclick: () => copy(c, `${c} copiato`) }, c))),
    h('div', { class: 'palette-info' },
      h('div', { style: 'flex:1; min-width:0' }, h('div', { class: 'record-title' }, p.name),
        p.client && h('div', { class: 'record-meta' }, p.client)),
      h('button', { class: 'ghost small', onclick: () => copy(p.colors.join(', '), 'Palette copiata') }, 'Copia tutti'),
      editing && h('button', { class: 'icon', title: 'Modifica', onclick: () => editRecord('palette', p) }, icon('pen')),
      editing && h('button', { class: 'icon', title: 'Elimina', onclick: () => deleteRecord('palette', p) }, icon('xmark')))))));
}

// --- PIXIESET (Fotografo): elenco delle gallerie, anche dalle schede di un foglio Google (una per fotografo)
const SHEET_SYNC_EVERY = 10 * 60 * 1000;
const MANUAL_TAB = 'Aggiunte a mano';
let sheetSyncing = false;
let lastSheetAttempt = 0; // anche i tentativi falliti: niente nuovi tentativi automatici a ogni ridisegno
let pixiesetQuery = '';

const renderIfPixiesetVisible = () => { if (page === 'pixieset') render(); };

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

// Ogni cella arriva come { v: testo visibile, u: link collegato al testo } (dallo script Google; dal CSV u è sempre null).
// Colonne riconosciute dall'intestazione: Cliente/Nome, Link, Password, Data, Note.
// Senza intestazione ogni riga si legge da sola: il primo link è la galleria, il primo testo il nome.
const isHttpUrl = (v) => /^https?:\/\/\S+$/i.test((v || '').trim());
const DATE_RE = /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/;
const GENERIC_LINK_TEXT = /^(pixieset|link|galleria|foto)$/i;
const cellText = (c) => String((c && c.v) || '').trim();
const cellLink = (c) => (c && isHttpUrl(c.u) ? c.u.trim() : isHttpUrl(cellText(c)) ? cellText(c) : '');

function galleriesFromSheet(rows) {
  if (!rows.length) return { list: [], skipped: 0 };
  const head = rows[0].map((c) => cellText(c).toLowerCase());
  const col = (re) => head.findIndex((v) => re.test(v));
  const iUrl = col(/link|url|indirizzo/);
  const idx = iUrl < 0 ? null : {
    url: iUrl, name: col(/cliente|nome|name|titolo|title|galleria/), password: col(/password|pass|pwd/),
    date: col(/^data|date/), note: col(/note|descrizione/),
  };
  const list = [];
  let skipped = 0;
  for (const cells of idx ? rows.slice(1) : rows) {
    if (!cells.some(cellText)) continue;
    let g;
    if (idx) {
      const linkCell = cells[idx.url];
      const linkText = cellText(linkCell);
      g = {
        // colonne spostate: se nella colonna del link non c'è, si prende il primo link della riga
        url: cellLink(linkCell) || cells.map(cellLink).find(Boolean) || '',
        name: cellText(cells[idx.name]),
        // testo collegato al posto dell'URL, es. "Sequenze by La Ville"
        title: linkText && !isHttpUrl(linkText) && !GENERIC_LINK_TEXT.test(linkText) ? linkText : '',
        password: cellText(cells[idx.password]), date: cellText(cells[idx.date]), note: cellText(cells[idx.note]),
      };
      // riga scritta una colonna più a sinistra: la data è finita nella colonna della password
      if (DATE_RE.test(g.password) && !DATE_RE.test(g.date)) {
        g.note = g.note || g.date; g.date = g.password; g.password = '';
      }
      // testo libero nella colonna della data (es. "Shooting Desenzano"): è una nota
      if (g.date && !DATE_RE.test(g.date) && !g.note) { g.note = g.date; g.date = ''; }
    } else {
      const links = cells.map(cellLink).filter(Boolean);
      g = { url: links[0] || '', name: cells.map(cellText).find((v) => v && !isHttpUrl(v)) || '' };
    }
    if (!g.url) { skipped++; continue; }
    list.push({ name: g.name || '', title: g.note || g.title || '', date: DATE_RE.test(g.date || '') ? g.date : '',
      password: g.password || '', url: g.url });
  }
  return { list, skipped };
}

// Nota uguale al nome della scheda (es. "Foto Matteo" nella scheda "Foto Matteo 2026"): non dice niente di nuovo
const redundantNote = (note, tab) => !!note && tab.toLowerCase().startsWith(note.toLowerCase());

async function syncPixiesetSheet({ quiet = false } = {}) {
  const cfg = state.pixiesetSheet;
  if (!cfg.url || sheetSyncing) return;
  sheetSyncing = true;
  lastSheetAttempt = Date.now();
  renderIfPixiesetVisible();
  const res = await window.api.fetchSheet(cfg.url, cfg.key);
  sheetSyncing = false;
  if (res.error) {
    cfg.error = res.error;
    save(); renderIfPixiesetVisible();
    if (!quiet) toast(res.error);
    return;
  }
  const sheets = res.sheets || [{ name: 'Foglio', rows: parseCsv(res.csv).map((r) => r.map((v) => ({ v, u: null }))) }];
  let skipped = 0;
  const fromSheet = [];
  for (const sh of sheets) {
    const parsed = galleriesFromSheet(sh.rows);
    skipped += parsed.skipped;
    for (const g of parsed.list) {
      fromSheet.push({ id: uid(), source: 'sheet', tab: sh.name, ...g, title: redundantNote(g.title, sh.name) ? '' : g.title });
    }
  }
  state.pixieset = [...state.pixieset.filter((g) => g.source !== 'sheet'), ...fromSheet];
  Object.assign(cfg, { syncedAt: Date.now(), error: '', skipped });
  save(); renderIfPixiesetVisible();
  if (!quiet) toast(`Foglio sincronizzato: ${fromSheet.length} gallerie`);
}

function galleryFields(g = {}) {
  return [
    { name: 'name', label: 'Cliente', value: g.name || '', placeholder: 'Es. La Ville' },
    { name: 'title', label: 'Galleria (facoltativo)', value: g.title || '', placeholder: 'Es. Shooting autunno' },
    { name: 'url', label: 'Link della galleria', value: g.url || '', placeholder: 'https://studio.pixieset.com/galleria/' },
    { name: 'password', label: 'Password (facoltativa)', value: g.password || '' },
    { name: 'date', label: 'Data (facoltativa)', value: g.date || '', placeholder: 'gg/mm/aa' },
  ];
}

function editGallery(g) {
  openForm({ title: g ? 'Modifica galleria' : 'Nuova galleria', fields: galleryFields(g),
    onSubmit: (v) => {
      if (!v.url) return false;
      const url = normalizeUrl(v.url);
      const target = g || { id: uid(), source: 'manual' };
      Object.assign(target, { url, name: v.name || deriveLabel(url), title: v.title, password: v.password, date: v.date });
      if (!g) state.pixieset.unshift(target);
      state.pixiesetSheet.tab = MANUAL_TAB;
      save(); render();
    } });
}

function connectSheet() {
  const cfg = state.pixiesetSheet;
  openForm({ title: 'Foglio Google', submitLabel: 'Collega',
    fields: [
      { name: 'url', label: 'Indirizzo dello script Google (…/exec) o link del foglio', value: cfg.url,
        placeholder: 'https://script.google.com/macros/s/…/exec' },
      { name: 'key', label: 'Chiave dello script (solo per lo script Google)', value: cfg.key || '' },
    ],
    onSubmit: (v) => {
      Object.assign(cfg, { url: v.url, key: v.key, error: '', syncedAt: 0 });
      if (!v.url) state.pixieset = state.pixieset.filter((g) => g.source !== 'sheet');
      save();
      if (v.url) syncPixiesetSheet(); // prima del render, così la pagina non avvia una seconda sincronizzazione silenziosa
      render();
    } });
}

const galleryTab = (g) => (g.source === 'sheet' ? g.tab || 'Foglio' : MANUAL_TAB);

function galleryRow(g) {
  const url = normalizeUrl(g.url);
  const sub = [g.date, hostOf(url)].filter(Boolean).join(' · ');
  return h('div', { class: 'record gallery-row' },
    h('div', { class: 'record-main' },
      h('div', { class: 'record-title' }, g.name, g.title && h('span', { class: 'gallery-title' }, ' · ', g.title)),
      h('div', { class: 'record-meta', title: url }, sub)),
    h('button', { class: 'ghost small', title: url, onclick: () => window.api.openExternal(url) }, 'Apri'),
    h('button', { class: 'ghost small', title: 'Copia link', onclick: () => copy(url, 'Link copiato') }, icon('copy'), ' Link'),
    h('button', { class: 'ghost small', title: g.password ? 'Copia password' : 'Nessuna password', disabled: !g.password,
      onclick: () => copy(g.password, 'Password copiata') }, icon('key'), ' Password'),
    editing && g.source !== 'sheet' && h('button', { class: 'icon', title: 'Modifica', onclick: () => editGallery(g) }, icon('pen')),
    editing && g.source !== 'sheet' && h('button', { class: 'icon', title: 'Elimina', onclick: () => confirmBox(`Eliminare "${g.name}"?`, () => {
      state.pixieset = state.pixieset.filter((x) => x.id !== g.id); save(); render();
    }) }, icon('xmark')));
}

const galleryMatches = (g, q) => `${g.name} ${g.title || ''} ${g.date || ''} ${g.url}`.toLowerCase().includes(q);

function renderPixieset(view) {
  const cfg = state.pixiesetSheet;
  const syncedTime = cfg.syncedAt && new Date(cfg.syncedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const status = sheetSyncing ? 'Sincronizzazione…'
    : cfg.error ? cfg.error
      : syncedTime ? `Sincronizzato alle ${syncedTime}${cfg.skipped ? ` · ${cfg.skipped} righe senza link ignorate` : ''}` : '';
  view.append(h('div', { class: 'row', style: 'margin-bottom:12px; align-items:center; flex-wrap:wrap' },
    h('button', { class: 'primary', onclick: () => editGallery() }, '+ Nuova galleria'),
    h('button', { class: 'ghost', onclick: connectSheet }, icon('table'), cfg.url ? ' Foglio Google' : ' Collega foglio Google'),
    cfg.url && h('button', { class: 'ghost', disabled: sheetSyncing, onclick: () => syncPixiesetSheet() }, icon('rotate'), ' Aggiorna dal foglio'),
    status && h('span', { class: 'sheet-status' + (cfg.error ? ' error' : '') }, status)));

  if (cfg.url && !sheetSyncing && Date.now() - Math.max(cfg.syncedAt, lastSheetAttempt) > SHEET_SYNC_EVERY) syncPixiesetSheet({ quiet: true });

  if (!state.pixieset.length) {
    view.append(h('div', { class: 'empty' }, cfg.url ? 'Nessuna galleria nel foglio.'
      : 'Nessuna galleria. Aggiungile a mano o collega il foglio Google (vedi README: script Google per i fogli privati).'));
    return;
  }

  // Una scheda per foglio (fotografo), più quelle aggiunte a mano
  const tabs = [...new Set(state.pixieset.map(galleryTab))].sort((a, b) => (a === MANUAL_TAB) - (b === MANUAL_TAB));
  if (!tabs.includes(cfg.tab)) cfg.tab = tabs[0];
  if (tabs.length > 1) {
    view.append(h('div', { class: 'subtabs' }, tabs.map((t) =>
      h('button', { class: 'subtab' + (t === cfg.tab ? ' active' : ''), onclick: () => { cfg.tab = t; save(); render(); } },
        t, h('span', { class: 'subtab-count' }, state.pixieset.filter((g) => galleryTab(g) === t).length)))));
  }

  // Il filtro ridisegna solo l'elenco, così il campo non perde il focus
  const list = h('div', { class: 'card records' });
  const fill = () => {
    const q = pixiesetQuery.trim().toLowerCase();
    const shown = state.pixieset.filter((g) => galleryTab(g) === cfg.tab && (!q || galleryMatches(g, q)));
    list.replaceChildren(...(shown.length ? shown.map(galleryRow) : [h('div', { class: 'empty' }, 'Nessuna galleria trovata.')]));
  };
  view.append(
    h('div', { class: 'search gallery-search' }, icon('magnifying-glass', 'search-icon'),
      h('input', { type: 'text', placeholder: 'Cerca cliente, galleria, data…', value: pixiesetQuery,
        oninput: (e) => { pixiesetQuery = e.target.value; fill(); } })),
    list);
  fill();
}

// --- ASANA: task aperti assegnati a me (li legge il processo principale, che avvisa dei nuovi)
let asanaState = { connected: false, user: '', tasks: [], projects: [], unseen: [], syncedAt: 0, error: '', syncing: false };
// Task segnati "Nuovo" nella sezione: restano evidenziati finché la si lascia, anche dopo averli segnati come visti
let asanaHighlight = new Set();

function onAsanaUpdate(s) {
  asanaState = s;
  if (page === 'asana' && s.unseen.length) {
    s.unseen.forEach((g) => asanaHighlight.add(g));
    window.api.asanaSeen();
  }
  if (page === 'asana') render();
  else renderNav();
}

function connectAsana() {
  openForm({ title: 'Collega Asana', submitLabel: 'Collega',
    fields: [{ name: 'token', label: 'Token personale di Asana', value: '', placeholder: 'Incollalo qui' }],
    onSubmit: async (v) => {
      if (!v.token) return;
      toast('Collegamento ad Asana…');
      const res = await window.api.asanaConnect(v.token);
      toast(res.ok ? 'Asana collegato' : res.error);
    } });
}

function disconnectAsana() {
  confirmBox('Scollegare Asana? Il token viene cancellato da questo computer.', async () => {
    await window.api.asanaConnect('');
    toast('Asana scollegato');
  }, 'Scollega');
}

// Scheda (task/progetti), raggruppamento dei task e ricerca: restano finché l'app è aperta
const asanaView = { tab: 'tasks', groupBy: 'due', query: '' };
const ASANA_DUE_SOON_DAYS = 7;
const NO_PROJECT = 'Senza progetto';

// Colori dei progetti di Asana (nomi dell'API) in esadecimale
const ASANA_COLORS = {
  'dark-red': '#e8384f', 'dark-orange': '#fd612c', 'light-orange': '#fd9a00', 'dark-brown': '#eec300',
  'light-green': '#a4cf30', 'dark-green': '#37c5ab', 'light-teal': '#20aaea', 'dark-teal': '#4186e0',
  'light-blue': '#7a6ff0', 'dark-purple': '#aa62e3', 'light-purple': '#e362e3', 'light-pink': '#ea4e9d',
  'dark-pink': '#fc91ad', 'light-red': '#8da3a6', 'light-warm-gray': '#8da3a6', 'dark-warm-gray': '#6d6e6f',
};

const addDaysISO = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 864e5);
const taskProject = (t) => t.projects[0] || NO_PROJECT;
const taskMatches = (t, q) => `${t.name} ${t.parent} ${t.projects.join(' ')} ${t.section}`.toLowerCase().includes(q);

// Etichetta del progetto accanto al nome del task, col colore che ha su Asana
function projectTag(name) {
  const p = (asanaState.projects || []).find((x) => x.name === name);
  const color = (p && ASANA_COLORS[p.color]) || colorFor(name);
  return h('span', { class: 'project-tag', style: `--tag:${color}` }, name.trim());
}

function asanaRow(t, { showWorkspace } = {}) {
  const today = todayISO();
  const overdue = !!t.due && t.due < today;
  // I sotto-task da soli dicono poco: si mostra anche il task padre
  const meta = [t.parent && `↳ ${t.parent}`, overdue && `in ritardo di ${daysBetween(t.due, today)} gg`, showWorkspace && t.workspace].filter(Boolean);
  return h('div', { class: 'record clickable', title: t.url, onclick: () => window.api.openExternal(t.url) },
    dateBlock(t.due, overdue),
    h('div', { class: 'record-main' },
      h('div', { class: 'record-title' }, t.name, t.projects.map(projectTag),
        asanaHighlight.has(t.gid) && h('span', { class: 'new-tag' }, 'Nuovo')),
      meta.length > 0 && h('div', { class: 'record-meta' + (overdue ? ' overdue' : '') }, meta.join(' · '))),
    h('button', { class: 'ghost small' }, 'Apri'));
}

function taskGroupsByDue(tasks) {
  const today = todayISO();
  const soon = addDaysISO(today, ASANA_DUE_SOON_DAYS);
  const sorted = [...tasks].sort((x, y) => (x.due || '9999').localeCompare(y.due || '9999'));
  return [
    ['Scaduti', sorted.filter((t) => t.due && t.due < today)],
    ['Oggi', sorted.filter((t) => t.due === today)],
    [`Prossimi ${ASANA_DUE_SOON_DAYS} giorni`, sorted.filter((t) => t.due > today && t.due <= soon)],
    ['Più avanti', sorted.filter((t) => t.due > soon)],
    ['Senza scadenza', sorted.filter((t) => !t.due)],
  ];
}

// Progetti in ordine alfabetico, "Senza progetto" in fondo; dentro, prima le scadenze più vicine
function taskGroupsByProject(tasks) {
  const groups = new Map();
  for (const t of [...tasks].sort((x, y) => (x.due || '9999').localeCompare(y.due || '9999'))) {
    const key = taskProject(t);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  return [...groups].sort(([a], [b]) => (a === NO_PROJECT) - (b === NO_PROJECT) || a.localeCompare(b, 'it'));
}

function renderAsanaTasks(view, a) {
  if (!a.tasks.length) {
    view.append(h('div', { class: 'empty' }, a.syncedAt ? 'Nessun task aperto assegnato a te.' : 'Caricamento dei task…'));
    return;
  }
  const showWorkspace = new Set(a.tasks.map((t) => t.workspace)).size > 1;
  const byProject = asanaView.groupBy === 'project';
  const list = h('div');
  // Il filtro ridisegna solo l'elenco, così il campo non perde il focus
  const fill = () => {
    const q = asanaView.query.trim().toLowerCase();
    const shown = a.tasks.filter((t) => !q || taskMatches(t, q));
    const groups = (byProject ? taskGroupsByProject : taskGroupsByDue)(shown).filter(([, l]) => l.length);
    list.replaceChildren(...(groups.length ? groups.flatMap(([title, l]) => [
      h('div', { class: 'section-title' }, `${title} (${l.length})`),
      h('div', { class: 'card records' }, l.map((t) => asanaRow(t, { showWorkspace }))),
    ]) : [h('div', { class: 'empty' }, 'Nessun task trovato.')]));
  };
  view.append(
    h('div', { class: 'row', style: 'align-items:center; flex-wrap:wrap; gap:12px' },
      h('div', { class: 'search gallery-search', style: 'flex:1; min-width:220px' }, icon('magnifying-glass', 'search-icon'),
        h('input', { type: 'text', placeholder: 'Cerca task, progetto…', value: asanaView.query,
          oninput: (e) => { asanaView.query = e.target.value; fill(); } })),
      h('div', { class: 'segmented' }, [['due', 'Per scadenza'], ['project', 'Per progetto']].map(([id, label]) =>
        h('button', { class: id === asanaView.groupBy ? 'active' : '', onclick: () => { asanaView.groupBy = id; render(); } }, label)))),
    list);
  fill();
}

function projectTile(p, openCount) {
  const bg = ASANA_COLORS[p.color] || colorFor(p.name);
  const sub = !openCount ? 'Nessun task tuo aperto' : openCount === 1 ? '1 task tuo aperto' : `${openCount} task tuoi aperti`;
  return h('div', { class: 'link-tile', role: 'button', tabindex: '0', title: p.url,
    onclick: () => window.api.openExternal(p.url),
    onkeydown: (e) => { if (e.key === 'Enter') window.api.openExternal(p.url); } },
    h('div', { class: 'badge', style: `background:${bg}` }, (p.name.trim()[0] || '?').toUpperCase()),
    h('div', { class: 'meta' }, h('div', { class: 'name' }, p.name.trim()), h('div', { class: 'sub' }, sub)));
}

function renderAsanaProjects(view, a) {
  const projects = a.projects || [];
  if (!projects.length) {
    view.append(h('div', { class: 'empty' }, a.syncedAt ? 'Nessun progetto: non fai parte di nessun progetto e non hai preferiti su Asana.' : 'Caricamento dei progetti…'));
    return;
  }
  const counts = new Map();
  for (const t of a.tasks) for (const name of t.projects) counts.set(name, (counts.get(name) || 0) + 1);
  const countOf = (p) => counts.get(p.name) || 0;
  const list = h('div');
  const fill = () => {
    const q = asanaView.query.trim().toLowerCase();
    const shown = projects.filter((p) => !q || p.name.toLowerCase().includes(q));
    const favorites = shown.filter((p) => p.favorite >= 0).sort((x, y) => x.favorite - y.favorite);
    // Prima quelli con task miei aperti, poi in ordine alfabetico
    const others = shown.filter((p) => p.favorite < 0)
      .sort((x, y) => (countOf(y) > 0) - (countOf(x) > 0) || x.name.trim().localeCompare(y.name.trim(), 'it'));
    const groups = [['Preferiti', favorites], ['I miei progetti', others]].filter(([, l]) => l.length);
    list.replaceChildren(...(groups.length ? groups.flatMap(([title, l]) => [
      h('div', { class: 'section-title' }, `${title} (${l.length})`),
      h('div', { class: 'grid' }, l.map((p) => projectTile(p, countOf(p)))),
    ]) : [h('div', { class: 'empty' }, 'Nessun progetto trovato.')]));
  };
  view.append(
    h('div', { class: 'search gallery-search' }, icon('magnifying-glass', 'search-icon'),
      h('input', { type: 'text', placeholder: 'Cerca progetto…', value: asanaView.query,
        oninput: (e) => { asanaView.query = e.target.value; fill(); } })),
    list,
    h('div', { class: 'hint' }, 'Preferiti: i progetti con la stella su Asana, nello stesso ordine. Sotto, gli altri progetti di cui fai parte.'));
  fill();
}

function renderAsana(view) {
  const a = asanaState;
  if (!a.connected) {
    view.append(
      h('div', { class: 'empty' }, 'Collega il tuo account Asana: qui vedi i task aperti assegnati a te e ricevi un avviso quando ne arriva uno nuovo.'),
      h('div', { class: 'row', style: 'margin-bottom:12px' },
        h('button', { class: 'primary', onclick: connectAsana }, 'Collega Asana'),
        h('button', { class: 'ghost', onclick: () => window.api.openExternal('https://app.asana.com/0/my-apps?open_in_browser=true') }, 'Crea il token su Asana')),
      h('div', { class: 'hint' }, 'Crea il token su ',
        h('a', { href: '#', onclick: (e) => { e.preventDefault(); window.api.openExternal('https://app.asana.com/0/my-apps?open_in_browser=true'); } }, 'https://app.asana.com/0/my-apps'),
        ': Token di accesso personali → "+ Crea nuovo token" → copia il token e incollalo in "Collega Asana". '
        + 'Il token resta solo su questo computer e non finisce nei backup.'));
    return;
  }
  if (a.unseen.length) {
    a.unseen.forEach((g) => asanaHighlight.add(g));
    a.unseen = [];
    window.api.asanaSeen();
  }

  const syncedTime = a.syncedAt && new Date(a.syncedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const status = a.syncing ? 'Aggiornamento…' : a.error || (syncedTime ? `Aggiornato alle ${syncedTime}` : '');
  view.append(h('div', { class: 'row', style: 'margin-bottom:12px; align-items:center; flex-wrap:wrap' },
    h('button', { class: 'ghost', disabled: a.syncing, onclick: () => window.api.asanaSync() }, icon('rotate'), ' Aggiorna'),
    h('button', { class: 'ghost', onclick: connectAsana }, icon('key'), ' Cambia token'),
    h('button', { class: 'ghost', onclick: disconnectAsana }, 'Scollega'),
    status && h('span', { class: 'sheet-status' + (a.error ? ' error' : '') }, status)));

  const overdue = a.tasks.filter((t) => t.due && t.due < todayISO()).length;
  const tabs = [['tasks', 'Task', a.tasks.length], ['projects', 'Progetti', (a.projects || []).length]];
  view.append(h('div', { class: 'subtabs' }, tabs.map(([id, label, n]) =>
    h('button', { class: 'subtab' + (id === asanaView.tab ? ' active' : ''), onclick: () => { asanaView.tab = id; asanaView.query = ''; render(); } },
      label, h('span', { class: 'subtab-count' }, n),
      id === 'tasks' && overdue > 0 && h('span', { class: 'subtab-count danger', title: 'Scaduti' }, `${overdue} scaduti`)))));
  (asanaView.tab === 'projects' ? renderAsanaProjects : renderAsanaTasks)(view, a);
}

// ---------- Account Solferino 3 (codice per dispositivo, sincronizzazione, amministrazione) ----------
let cloudState = { connected: false, user: null, sharedTools: null };
const WEB_URL = 'https://solferino3-dashboard-api.m-gallo.workers.dev/'; // versione web (cloud/public), sincronizzata con l'app
let cloudRedeeming = false;
let adminUsers = null; // null = da caricare
let adminError = '';
let kitDraft = null; // URL scelti per il kit mentre l'admin lo modifica

const isAdmin = () => cloudState.connected && cloudState.user && cloudState.user.role === 'admin';
const kitUrlKey = (u) => normalizeUrl(u).toLowerCase().replace(/\/+$/, '');

function onCloudUpdate(c) {
  const roleChanged = (c.user && c.user.role) !== (cloudState.user && cloudState.user.role);
  const notesChanged = JSON.stringify(c.sharedNotes || []) !== JSON.stringify(cloudState.sharedNotes || []);
  const synced = c.syncedAt !== cloudState.syncedAt;
  cloudState = c;
  if (!c.connected) { adminUsers = null; kitDraft = null; teamList = null; }
  if (synced) teamList = null; // nuovi colleghi o nomi cambiati
  if (page === 'settings' || roleChanged || (page === 'appunti' && (notesChanged || synced) && !appuntoFormFor)) render();
  else renderNav(); // contatore degli appunti condivisi nuovi
  if (synced || notesChanged) syncSharedNotes();
}

// Dati arrivati da un altro dispositivo (o versione online più recente)
function onDataRemote({ data, conflict }) {
  clearTimeout(save._t);
  state = normalizeState(data);
  applyAppearance();
  window.api.setIcon(state.settings.iconData || null);
  render();
  toast(conflict ? 'Dati aggiornati dall\'account: la versione precedente è salvata in copia' : 'Dati aggiornati dall\'account');
}

async function cloudRedeem(code) {
  if (!code.trim()) return toast('Inserisci il codice');
  cloudRedeeming = true;
  render();
  const res = await window.api.cloudRedeem(code);
  cloudRedeeming = false;
  render();
  toast(res.ok ? 'Computer collegato' : res.error);
}

function cloudLogout() {
  confirmBox('Scollegare questo computer? I dati restano qui ma non si sincronizzano più; per ricollegarlo serve un nuovo codice.', async () => {
    await window.api.cloudLogout();
    toast('Computer scollegato');
  }, 'Scollega');
}

// Mostra un codice appena generato, da copiare e mandare alla persona
function showCode({ code, email, expiresAt }, intro) {
  const dlg = $('#modal');
  dlg.replaceChildren(h('form', { method: 'dialog' },
    h('h2', null, 'Codice per collegare un computer'),
    h('p', null, intro || `Per ${email}.`),
    h('div', { style: 'font:600 26px ui-monospace,Menlo,monospace; letter-spacing:.08em; text-align:center; padding:14px; border:1px solid var(--line); border-radius:var(--radius); margin:10px 0; user-select:all' }, code),
    h('div', { class: 'hint' }, `Va inserito in Impostazioni → Account Solferino 3 entro il ${new Date(expiresAt).toLocaleDateString('it-IT')}. `
      + 'Vale una sola volta e per un solo computer.'),
    h('div', { class: 'modal-actions' },
      h('button', { type: 'button', class: 'ghost', onclick: () => copy(`Codice per Solferino 3 Dashboard: ${code}`, 'Codice copiato') }, icon('copy'), ' Copia'),
      h('button', { type: 'submit', class: 'primary' }, 'Fatto'))));
  dlg.showModal();
}

async function codeAction(promise, intro) {
  const res = await promise;
  if (!res.ok) return toast(res.error);
  showCode(res.result, intro);
}

async function adminAction(promise, okMsg) {
  const res = await promise;
  if (!res.ok) { toast(res.error); return false; }
  adminUsers = null;
  if (okMsg) toast(okMsg);
  render();
  return true;
}

async function loadAdminUsers() {
  const res = await window.api.cloudUsers();
  adminUsers = res.ok ? res.result : [];
  adminError = res.ok ? '' : res.error;
  if (page === 'settings') render();
}

function renderAccount(view) {
  const c = cloudState;
  view.append(h('div', { class: 'section-title' }, 'Account Solferino 3'));
  if (!c.connected) {
    const input = h('input', { type: 'text', placeholder: 'XXXX-XXXX-XXXX', autocomplete: 'off', spellcheck: 'false',
      style: 'font-family:ui-monospace,Menlo,monospace; letter-spacing:.06em',
      onkeydown: (e) => { if (e.key === 'Enter') cloudRedeem(input.value); } });
    view.append(
      h('div', { class: 'card' },
        h('div', { class: 'row', style: 'align-items:center' },
          input,
          h('button', { class: 'primary', disabled: cloudRedeeming, onclick: () => cloudRedeem(input.value) }, icon('key'), cloudRedeeming ? ' Collegamento…' : ' Collega')),
        c.error && h('div', { class: 'sheet-status error', style: 'margin-top:8px' }, c.error)),
      h('div', { class: 'hint' }, 'Inserisci il codice che ti ha dato un amministratore: i tuoi dati si sincronizzano tra i computer e ricevi il kit di link aggiornato. '
        + 'Per un altro computer genera un nuovo codice da qui, una volta collegato. Token Asana e anteprime dei siti restano su questo computer.'));
    return;
  }
  const u = c.user || {};
  const time = c.syncedAt && new Date(c.syncedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const status = c.syncing ? 'Sincronizzazione…' : c.error || (c.dirty ? 'Modifiche da inviare' : time ? `Sincronizzato alle ${time}` : '');
  view.append(h('div', { class: 'card' },
    h('div', { style: 'font-weight:600' }, u.name || u.email, h('span', { class: 'tool-group-tag', style: 'margin-left:8px' }, u.role === 'admin' ? 'Amministratore' : 'Utente')),
    u.name && h('div', { class: 'hint', style: 'margin-top:2px' }, u.email),
    h('div', { class: 'row', style: 'margin-top:10px; align-items:center; flex-wrap:wrap' },
      h('button', { class: 'ghost', disabled: c.syncing, onclick: () => window.api.cloudSync() }, icon('rotate'), ' Sincronizza'),
      h('button', { class: 'ghost', onclick: () => codeAction(window.api.cloudMyCode(), 'Inseriscilo sull\'altro computer o nella versione web per ritrovare lì i tuoi dati.') }, 'Collega un altro computer'),
      !IS_WEB && h('button', { class: 'ghost', title: WEB_URL, onclick: () => window.api.openExternal(WEB_URL) }, 'Versione web'),
      h('button', { class: 'ghost', onclick: cloudLogout }, 'Scollega'),
      status && h('span', { class: 'sheet-status' + (c.error ? ' error' : '') }, status))));
  if (u.role === 'admin') renderAdmin(view);
}

function renderAdmin(view) {
  if (adminUsers === null) loadAdminUsers();
  const me = cloudState.user.email;
  const roleLabel = (r) => (r === 'admin' ? 'Amministratore' : 'Utente');
  const invite = () => openForm({ title: 'Invita un collega', submitLabel: 'Invita',
    fields: [
      { name: 'email', label: 'Email @solferino3.it', placeholder: 'nome@solferino3.it' },
      { name: 'name', label: 'Nome', placeholder: 'Nome e cognome' },
      { name: 'role', label: 'Ruolo', type: 'select', value: 'user', options: [{ value: 'user', label: 'Utente' }, { value: 'admin', label: 'Amministratore' }] },
    ],
    onSubmit: (v) => {
      if (!v.email) return false;
      window.api.cloudInvite(v.email, v.name, v.role).then((res) => {
        if (!res.ok) return toast(res.error);
        adminUsers = null;
        render();
        showCode(res.result, `${v.name || v.email} è stato invitato. Mandagli questo codice per collegare il suo computer.`);
      });
    } });

  view.append(
    h('div', { class: 'section-title' }, 'Amministrazione · Utenti'),
    h('div', { class: 'card' },
      adminUsers === null ? h('div', { class: 'hint', style: 'margin:0' }, 'Caricamento…')
        : adminError ? h('div', { class: 'sheet-status error' }, adminError)
          : adminUsers.map((x) => h('div', { class: 'row', style: 'align-items:center; padding:6px 0; border-bottom:1px solid var(--line)' },
            h('div', { style: 'flex:1; min-width:0' },
              h('div', null, x.name || x.email),
              h('div', { class: 'sheet-status' }, x.name ? `${x.email} · ` : '',
                x.devices ? `${x.devices === 1 ? '1 computer' : `${x.devices} computer`} · ultimo accesso ${new Date(x.lastSeen).toLocaleDateString('it-IT')}` : 'nessun computer collegato')),
            h('button', { class: 'ghost small', onclick: () => codeAction(window.api.cloudUserCode(x.email)) }, 'Codice'),
            x.email === me ? h('span', { class: 'tool-group-tag', style: 'margin-left:0' }, `${roleLabel(x.role)} (tu)`) : [
              h('select', { style: 'width:auto; flex:none', onchange: (e) => adminAction(window.api.cloudSetRole(x.email, e.target.value), 'Ruolo aggiornato') },
                ['user', 'admin'].map((r) => h('option', { value: r, selected: r === x.role }, roleLabel(r)))),
              h('button', { class: 'icon', title: 'Rimuovi', onclick: () => confirmBox(`Rimuovere ${x.email}? Non potrà più accedere; se lo inviti di nuovo ritrova i suoi dati.`,
                () => adminAction(window.api.cloudRemoveUser(x.email), 'Utente rimosso'), 'Rimuovi') }, icon('xmark')),
            ])),
      h('div', { class: 'row', style: 'margin-top:10px' },
        h('button', { class: 'primary', onclick: invite }, 'Invita un collega'))),
    h('div', { class: 'hint' }, 'Ogni computer si collega con un codice monouso: "Codice" ne genera uno per quella persona. '
      + 'Rimuovendo qualcuno si scollegano tutti i suoi computer. Gli amministratori non vedono i dati personali degli altri.'));

  // Kit di link condiviso: l'admin sceglie quali dei propri Strumenti pubblicare per tutti
  const kit = new Set(kitTools().map((t) => kitUrlKey(t.url)));
  if (!kitDraft) kitDraft = new Set(state.tools.filter((t) => kit.has(kitUrlKey(t.url))).map((t) => kitUrlKey(t.url)));
  const publish = () => {
    const tools = state.tools.filter((t) => kitDraft.has(kitUrlKey(t.url)) && /^https?:\/\//i.test(normalizeUrl(t.url)))
      .map((t) => ({ category: t.category || '', label: t.label, url: normalizeUrl(t.url),
        ...(t.icon && !t.icon.startsWith('data:') ? { icon: t.icon } : {}) }));
    if (!tools.length) return toast('Scegli almeno un link');
    confirmBox(`Pubblicare il kit con ${tools.length} link? Lo ricevono tutti gli utenti dell'account.`,
      () => adminAction(window.api.cloudPublishTools(tools), 'Kit di link pubblicato'), 'Pubblica');
  };
  const missingFromMine = kitTools().filter((t) => !state.tools.some((x) => kitUrlKey(x.url) === kitUrlKey(t.url)));
  view.append(
    h('div', { class: 'section-title' }, 'Amministrazione · Kit di link'),
    h('div', { class: 'card' },
      state.tools.length ? state.tools.map((t) => h('label', { class: 'tool-toggle' },
        h('input', { type: 'checkbox', checked: kitDraft.has(kitUrlKey(t.url)),
          onchange: (e) => { const k = kitUrlKey(t.url); e.target.checked ? kitDraft.add(k) : kitDraft.delete(k); } }),
        h('span', null, t.label),
        t.category && h('span', { class: 'tool-note' }, t.category)))
        : h('div', { class: 'hint', style: 'margin:0' }, 'Aggiungi prima dei link in Strumenti.'),
      h('div', { class: 'row', style: 'margin-top:10px' },
        h('button', { class: 'primary', onclick: publish }, 'Pubblica kit'))),
    h('div', { class: 'hint' }, 'Il kit si compone dai tuoi Strumenti: spunta i link da condividere. '
      + (missingFromMine.length ? `Nel kit attuale ci sono link che non hai in Strumenti (${missingFromMine.map((t) => t.label).join(', ')}): ripubblicando verrebbero tolti.` : '')));
}

// ---------- Aspetto ----------
const PALETTES = [
  // Predefinita: i colori di solferino3.it (carta #F2EEEC, notte #02182B, accento #6295A5)
  { id: 'solferino', label: 'Solferino 3',
    light: { bg: '#f2eeec', panel: '#ffffff', sidebar: '#e7e2df', line: '#d9d6d5', accent: '#6295a5' },
    dark: { bg: '#02182b', panel: '#04243d', sidebar: '#000b14', line: '#20374a', accent: '#6295a5' } },
  { id: 'rosa', label: 'Rosa',
    light: { bg: '#fcf2f5', panel: '#ffffff', sidebar: '#f7e3e9', line: '#eed6dd', accent: '#2f5bea' },
    dark: { bg: '#1c1719', panel: '#282224', sidebar: '#241c1f', line: '#3e3337', accent: '#7b9bff' } },
  { id: 'neutro', label: 'Neutro',
    light: { bg: '#f5f5f4', panel: '#ffffff', sidebar: '#ebebe9', line: '#e0dfdc', accent: '#2f5bea' },
    dark: { bg: '#18181a', panel: '#242427', sidebar: '#1f1f22', line: '#36363a', accent: '#7b9bff' } },
  { id: 'blu', label: 'Blu',
    light: { bg: '#f1f5fc', panel: '#ffffff', sidebar: '#e1eaf8', line: '#d6e0f0', accent: '#2f5bea' },
    dark: { bg: '#151a24', panel: '#1f2633', sidebar: '#1a202b', line: '#313a4a', accent: '#7b9bff' } },
  { id: 'verde', label: 'Verde',
    light: { bg: '#f1f8f4', panel: '#ffffff', sidebar: '#ddefe4', line: '#d1e6d9', accent: '#1f8a5b' },
    dark: { bg: '#141c18', panel: '#1f2924', sidebar: '#19221e', line: '#2f3d36', accent: '#5fd19b' } },
  { id: 'viola', label: 'Viola',
    light: { bg: '#f6f2fc', panel: '#ffffff', sidebar: '#e9e0f7', line: '#e0d5f0', accent: '#7a3fd6' },
    dark: { bg: '#1a1622', panel: '#251f30', sidebar: '#1f1a29', line: '#3a3149', accent: '#b18cff' } },
  { id: 'sabbia', label: 'Sabbia',
    light: { bg: '#faf6ef', panel: '#ffffff', sidebar: '#f0e7d8', line: '#e8dcc8', accent: '#c2621a' },
    dark: { bg: '#1e1a15', panel: '#2a251f', sidebar: '#241f1a', line: '#3d362d', accent: '#f0a35e' } },
];
const THEMES = [['system', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro']];
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applyAppearance() {
  const s = state.settings;
  const pal = PALETTES.find((p) => p.id === s.palette) || PALETTES[0];
  const dark = s.theme === 'dark' || (s.theme === 'system' && darkQuery.matches);
  const c = dark ? pal.dark : pal.light;
  const accent = s.accent || c.accent;
  const root = document.documentElement.style;
  for (const k of ['bg', 'panel', 'sidebar', 'line']) root.setProperty('--' + k, c[k]);
  root.setProperty('--accent', accent);
  root.setProperty('--on-accent', readableOn(accent)); // testo leggibile sui pulsanti principali
  root.setProperty('--accent-soft', `color-mix(in srgb, ${accent} ${dark ? 24 : 13}%, ${c.panel})`);
  window.api.setAppearance({ theme: s.theme, bg: c.bg, fg: dark ? '#f2eeec' : '#02182b' });
}
darkQuery.addEventListener('change', () => state && applyAppearance());

// --- Icona dell'app: quella predefinita (#6295A5), varianti di colore dell'icona rosa originale o immagine caricata
const ICON_PRESETS = [
  { id: 'solferino', label: 'Solferino 3 (predefinita)', color: null },
  { id: 'rosa', label: 'Rosa', color: '#ea638c' },
  { id: 'blu', label: 'Blu', color: '#2f5bea' },
  { id: 'verde', label: 'Verde', color: '#1f8a5b' },
  { id: 'viola', label: 'Viola', color: '#7a3fd6' },
  { id: 'arancio', label: 'Arancio', color: '#e8772e' },
  { id: 'antracite', label: 'Antracite', color: '#2b2b2e' },
];
const APP_ICON_SIZE = 512;
const iconCache = new Map();
let baseIcon;

function loadBaseIcon() {
  baseIcon ||= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = '../build/icon-rosa.png'; // le varianti si ricavano dall'icona rosa originale
  });
  return baseIcon;
}

// Ricolora lo sfondo dell'icona rosa originale mantenendo bianco il "3" e l'ombra
async function tintedIcon(hex) {
  if (iconCache.has(hex)) return iconCache.get(hex);
  const img = await loadBaseIcon();
  const size = APP_ICON_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size);
  const px = data.data;
  const o = (Math.round(size * 0.5) * size + Math.round(size * 0.15)) * 4; // punto rosa a sinistra del "3"
  const baseG = px[o + 1];
  const target = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3] || px[i] - px[i + 1] < 25) continue; // bianco e grigi dell'ombra restano
    const w = Math.min(1, Math.max(0, (px[i + 1] - baseG) / (255 - baseG))); // quota di bianco sui bordi del "3"
    for (let c = 0; c < 3; c++) px[i + c] = target[c] + (255 - target[c]) * w;
  }
  ctx.putImageData(data, 0, 0);
  const url = canvas.toDataURL('image/png');
  iconCache.set(hex, url);
  return url;
}

async function chooseIcon(id, dataUrl) {
  Object.assign(state.settings, { iconId: id, iconData: dataUrl || '' });
  window.api.setIcon(dataUrl || null);
  save(); render();
}

// --- IMPOSTAZIONI
function renderSettings(view) {
  const s = state.settings;
  const set = (patch) => { Object.assign(s, patch); save(); applyAppearance(); render(); };
  const pal = PALETTES.find((p) => p.id === s.palette) || PALETTES[0];

  renderAccount(view);
  view.append(
    h('div', { class: 'section-title' }, 'Profilo'),
    h('div', { class: 'profile-grid' }, PROFILES.map((p) =>
      h('button', { class: 'profile-card' + (p.id === s.profile ? ' active' : ''), onclick: () => set({ profile: p.id }) },
        h('div', { class: 'profile-icon' }, icon(p.icon)),
        h('div', { class: 'profile-name' }, p.label),
        h('div', { class: 'profile-pages' }, p.pages.map((id) => PROFILE_PAGES[id].label).join(' · '))))),
    h('div', { class: 'hint' }, `Le sezioni ${COMMON_PAGES.map((p) => p.label).join(', ')} ci sono per tutti i profili. `
      + 'Cambiando profilo i dati delle altre sezioni restano salvati.'));

  // Strumenti: quelli del profilo sono sempre attivi, quelli degli altri profili si aggiungono con la spunta
  const toggleExtra = (id, on) => set({ extraPages: on ? [...s.extraPages, id] : s.extraPages.filter((x) => x !== id) });
  view.append(
    h('div', { class: 'section-title' }, 'Strumenti'),
    h('div', { class: 'tool-groups' }, PROFILES.map((p) => {
      const own = p.id === s.profile;
      return h('div', { class: 'card tool-group' + (own ? ' own' : '') },
        h('div', { class: 'tool-group-title' }, icon(p.icon), p.label, own && h('span', { class: 'tool-group-tag' }, 'Il tuo profilo')),
        p.pages.map((id) => {
          const included = currentProfile().pages.includes(id);
          return h('label', { class: 'tool-toggle' + (included ? ' included' : '') },
            h('input', { type: 'checkbox', checked: included || s.extraPages.includes(id), disabled: included,
              onchange: (e) => toggleExtra(id, e.target.checked) }),
            h('span', { class: 'nav-icon' }, icon(PROFILE_PAGES[id].icon)),
            h('span', null, PROFILE_PAGES[id].label),
            included && !own && h('span', { class: 'tool-note' }, 'già nel tuo profilo'));
        }));
    })),
    h('div', { class: 'hint' }, 'Gli strumenti spuntati compaiono nel menu sotto "Altri strumenti". Togliendo la spunta i dati restano salvati.'));

  // Kit di link: aggiunge alla sezione Strumenti i link predefiniti che mancano (confronto per URL)
  const urlKey = (u) => normalizeUrl(u).toLowerCase().replace(/\/+$/, '');
  const have = new Set(state.tools.map((t) => urlKey(t.url)));
  const missing = kitTools().filter((t) => !have.has(urlKey(t.url)));
  view.append(
    h('div', { class: 'section-title' }, 'Kit di link Solferino 3'),
    h('div', { class: 'card' },
      h('div', { class: 'hint', style: 'margin-top:0' }, kitTools().map((t) => t.label).join(' · ')),
      h('div', { class: 'row', style: 'margin-top:10px; align-items:center' },
        h('button', { class: 'primary', disabled: !missing.length, onclick: () => {
          state.tools.push(...defaultTools().filter((t) => !have.has(urlKey(t.url))));
          save(); render();
          toast(`${missing.length === 1 ? 'Aggiunto 1 link' : `Aggiunti ${missing.length} link`} in Strumenti`);
        } }, missing.length ? `Aggiungi a Strumenti (${missing.length})` : 'Già tutti in Strumenti'))),
    h('div', { class: 'hint' }, 'Si aggiungono solo i link che non hai già; quelli che hai restano come sono.'));

  view.append(
    h('div', { class: 'section-title' }, 'Tema'),
    h('div', { class: 'segmented' }, THEMES.map(([id, label]) =>
      h('button', { class: id === s.theme ? 'active' : '', onclick: () => set({ theme: id }) }, label))),
    h('div', { class: 'section-title' }, 'Colori'),
    h('div', { class: 'swatch-row' }, PALETTES.map((p) =>
      h('button', { class: 'palette-swatch' + (p.id === s.palette ? ' active' : ''), onclick: () => set({ palette: p.id, paletteChosen: true }) },
        h('div', { class: 'sw' }, h('span', { style: `background:${p.light.sidebar}` }),
          h('span', { style: `background:${p.dark.panel}` }), h('span', { style: `background:${p.light.accent}` })),
        p.label))),
    h('div', { class: 'accent-row' },
      h('span', null, 'Colore principale'),
      h('input', { type: 'color', value: s.accent || pal.light.accent,
        oninput: (e) => { s.accent = e.target.value; applyAppearance(); save(); },
        onchange: () => render() }),
      s.accent && h('button', { class: 'ghost small', onclick: () => set({ accent: '' }) }, 'Usa quello del tema')));

  const fileInput = h('input', { type: 'file', accept: 'image/*', style: 'display:none', onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { chooseIcon('custom', await imageFileToDataUrl(f, APP_ICON_SIZE)); }
    catch (err) { toast(err.message); }
  } });
  const presetTiles = ICON_PRESETS.map((p) => {
    const img = h('img', { alt: '' });
    if (p.color) tintedIcon(p.color).then((url) => { img.src = url; });
    else img.src = '../build/icon.png';
    return h('button', { class: 'icon-choice' + (s.iconId === p.id ? ' active' : ''), title: p.label,
      onclick: async () => chooseIcon(p.id, p.color ? await tintedIcon(p.color) : '') }, img);
  });
  view.append(
    h('div', { class: 'section-title' }, 'Icona dell\'app'),
    h('div', { class: 'icon-grid' },
      presetTiles,
      s.iconId === 'custom' && s.iconData && h('button', { class: 'icon-choice active', title: 'Immagine caricata' },
        h('img', { src: s.iconData, alt: '' })),
      h('button', { class: 'ghost small', onclick: () => fileInput.click() }, 'Carica immagine…'),
      fileInput),
    h('div', { class: 'hint' }, IS_WEB ? 'L\'icona cambia nella scheda del browser.' : IS_WIN
      ? 'L\'icona cambia nella barra delle applicazioni e nel widget. Il collegamento sul Desktop e nel menu Start mantiene quella predefinita.'
      : 'L\'icona cambia nel Dock e nel widget mentre l\'app è aperta. Nel Finder e nel Launchpad resta quella predefinita.'));
}

// ---------- Aggiornamenti ----------
// I controlli periodici e il download li fa il processo principale, che manda lo stato con 'update:available'
let updateRestarting = false;

function showUpdate(u) {
  const box = $('#update');
  if (updateRestarting) return;
  if (!u) { box.hidden = true; return; }
  const quitHint = IS_WIN ? 'quando chiudi l\'app' : 'quando esci dall\'app (⌘Q)';
  const text = h('div', { class: 'update-text' });
  const actions = h('div', { class: 'update-actions' });
  const manualLink = () => h('a', { href: '#', onclick: (e) => { e.preventDefault(); window.api.openExternal(u.downloadUrl); } }, 'Scarica a mano');
  if (u.state === 'manual') {
    text.append('Scarica il nuovo installer e installalo.');
    actions.append(h('button', { class: 'primary small', onclick: () => window.api.openExternal(u.downloadUrl) }, 'Scarica'));
  } else if (u.state === 'error') {
    text.append(`Download non riuscito (${u.error}), riprovo tra qualche minuto. `, manualLink());
  } else {
    text.append(u.state === 'ready'
      ? `Pronta: si installa da sola ${quitHint}. I tuoi dati restano.`
      : `Download in background${u.progress >= 0 ? ` (${u.progress}%)` : ''}: poi si installa da sola ${quitHint}.`);
    const restartBtn = h('button', { class: 'primary small', onclick: async () => {
      updateRestarting = true;
      restartBtn.disabled = true;
      text.textContent = u.state === 'ready' ? 'Riavvio in corso…' : 'Finisco il download e riavvio…';
      await window.api.save(state); // salva subito le modifiche in sospeso: l'app sta per chiudersi
      const res = await window.api.installUpdate();
      if (res.ok) return;
      updateRestarting = false;
      restartBtn.disabled = false;
      text.replaceChildren(`Installazione non riuscita (${res.error}). `, manualLink());
    } }, 'Riavvia ora');
    actions.append(restartBtn);
  }
  actions.append(h('button', { class: 'ghost small', onclick: () => window.api.openExternal(u.notesUrl) }, 'Novità'));
  box.replaceChildren(h('div', { class: 'update-title' }, `Nuova versione ${u.version}`), text, actions);
  box.hidden = false;
}

// ---------- Boot ----------
function normalizeState(d) {
  d = d && typeof d === 'object' ? d : {};
  return {
    version: 1,
    tools: Array.isArray(d.tools) ? d.tools : [],
    ...normalizeIdee(d),
    todos: Array.isArray(d.todos) ? d.todos : [],
    notes: typeof d.notes === 'string' ? d.notes : '',
    appunti: Array.isArray(d.appunti) ? d.appunti : [],
    unshareQueue: Array.isArray(d.unshareQueue) ? d.unshareQueue : [], // miei appunti condivisi eliminati, da segnalare ancora al server
    snippets: Array.isArray(d.snippets) ? d.snippets : [],
    ...Object.fromEntries(RECORD_KEYS.map((k) => [k, Array.isArray(d[k]) ? d[k] : []])),
    pixieset: Array.isArray(d.pixieset) ? d.pixieset : [],
    pixiesetSheet: { url: '', syncedAt: 0, error: '', ...(d.pixiesetSheet && typeof d.pixiesetSheet === 'object' ? d.pixiesetSheet : {}) },
    settings: normalizeSettings(d.settings),
  };
}

// Fino alla 1.11 Idee aveva tre schede fisse (libraries, ideaLinks, sites): diventano le prime tre schede.
// Un elemento con una scheda che non esiste più (es. dati salvati da una versione precedente) la fa ricreare.
function normalizeIdee(d) {
  const arr = (v) => (Array.isArray(v) ? v : []);
  const tabs = arr(d.ideeTabs).filter((t) => t && typeof t.id === 'string' && typeof t.label === 'string')
    .map((t) => ({ id: t.id, label: t.label, type: t.type === 'sites' ? 'sites' : 'links' }));
  const hadTabs = tabs.length > 0;
  if (!hadTabs) tabs.push(...DEFAULT_IDEE_TABS.map((t) => ({ ...t })));
  const ideaLinks = [
    ...arr(d.libraries).map((x) => ({ ...x, tab: x.tab || 'libraries' })),
    ...arr(d.ideaLinks).map((x) => ({ ...x, tab: x.tab || 'ideas' })),
  ];
  const sites = (Array.isArray(d.sites) ? d.sites : defaultSites()).map((x) => ({ ...x, tab: x.tab || 'sites' }));
  for (const [items, type] of [[ideaLinks, 'links'], [sites, 'sites']]) {
    for (const x of items) {
      if (tabs.some((t) => t.id === x.tab)) continue;
      const def = DEFAULT_IDEE_TABS.find((t) => t.id === x.tab);
      tabs.push(def ? { ...def } : { id: x.tab, label: type === 'sites' ? 'Siti' : 'Link', type });
    }
  }
  // Se l'utente ha eliminato una scheda predefinita resta eliminata (la ricrea solo un elemento orfano)
  return { ideeTabs: tabs, libraries: [], ideaLinks, sites };
}

function normalizeSettings(s) {
  s = s && typeof s === 'object' ? s : {};
  const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
  return {
    profile: pick(s.profile, PROFILES.map((p) => p.id), 'smm'),
    theme: pick(s.theme, THEMES.map(([id]) => id), 'system'),
    // Fino alla 1.4 la predefinita era Rosa: chi non ha mai scelto una palette passa a quella Solferino 3
    palette: pick(s.palette === 'rosa' && !s.paletteChosen ? 'solferino' : s.palette, PALETTES.map((p) => p.id), 'solferino'),
    paletteChosen: !!s.paletteChosen,
    accent: /^#[0-9a-f]{6}$/i.test(s.accent) ? s.accent : '',
    extraPages: Array.isArray(s.extraPages) ? [...new Set(s.extraPages.filter((id) => PROFILE_PAGES[id]))] : [],
    // Fino alla 1.4 l'icona predefinita era quella rosa (iconId 'rosa' senza immagine salvata)
    iconId: typeof s.iconId === 'string' && !(s.iconId === 'rosa' && !s.iconData) ? s.iconId : 'solferino',
    iconData: typeof s.iconData === 'string' && s.iconData.startsWith('data:image/') ? s.iconData : '',
  };
}

async function boot() {
  const loaded = await window.api.load();
  state = loaded ? normalizeState(loaded) : seedData();
  if (!loaded) await window.api.save(state);
  applyAppearance();

  $('#btn-edit').addEventListener('click', () => { editing = !editing; render(); });
  $('#btn-export').addEventListener('click', async () => { if (await window.api.exportData(state)) toast('Backup esportato'); });
  $('#btn-import').addEventListener('click', async () => {
    const data = await window.api.importData();
    if (!data) return;
    if (data.__error) return toast(data.__error);
    confirmBox('Importare il backup? I dati attuali verranno sostituiti.', async () => {
      // I backup delle versioni precedenti non hanno impostazioni: si tengono quelle attuali
      state = normalizeState({ settings: state.settings, ...data }); await window.api.save(state);
      applyAppearance(); window.api.setIcon(state.settings.iconData || null);
      render(); toast('Backup importato');
    }, 'Importa');
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (page !== 'home') go('home');
      const s = $('#search'); if (s) { s.focus(); s.select(); }
    }
  });
  chromeProfiles = await window.api.chromeProfiles();
  asanaState = await window.api.asanaGet();
  window.api.onAsana(onAsanaUpdate);
  cloudState = await window.api.cloudGet();
  window.api.onCloud(onCloudUpdate);
  window.api.onDataRemote(onDataRemote);
  window.api.onOpenNotes(() => go('appunti'));
  render();
  syncSharedNotes();
  window.api.onUpdate(showUpdate);
  window.api.checkUpdate().then(showUpdate);
}
boot();
