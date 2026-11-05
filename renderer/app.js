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
const IS_WIN = window.api.platform === 'win32';
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
  for (const f of fields) {
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
  ['bold', 'B', 'Grassetto'],
  ['italic', 'I', 'Corsivo'],
  ['underline', 'U', 'Sottolineato'],
  ['strikeThrough', 'S', 'Barrato'],
  ['insertUnorderedList', '•', 'Elenco'],
  ['insertOrderedList', '1.', 'Elenco numerato'],
];
function richTextInput(value) {
  const content = h('div', { class: 'rte-content', contenteditable: 'true' });
  content.innerHTML = value || '';
  const toolbar = h('div', { class: 'rte-toolbar' }, RTE_COMMANDS.map(([cmd, label, title]) =>
    h('button', { type: 'button', title,
      onmousedown: (e) => e.preventDefault(),
      onclick: () => { document.execCommand(cmd); content.focus(); } }, label)));
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

function seedData() {
  return normalizeState({ sites: defaultSites() });
}

let state;
let page = 'home';
let editing = false;
let query = '';
let appuntoFormFor = null; // null | 'new' | id dell'appunto in modifica
let todoArchiveOpen = false;

let saveTimer;
function save() {
  clearTimeout(save._t);
  save._t = setTimeout(() => window.api.save(state), 250);
}

// ---------- Pages ----------
// Sezioni comuni a tutti i profili
const COMMON_PAGES = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'tools', label: 'Strumenti', icon: '⚒' },
  { id: 'idee', label: 'Idee', icon: '✦' },
  { id: 'todos', label: 'To-do', icon: '✓' },
  { id: 'notes', label: 'Note', icon: '✎' },
  { id: 'appunti', label: 'Appunti', icon: '🗒' },
  { id: 'snippets', label: 'Snippet', icon: '❝' },
];
// Sezioni aggiunte dal profilo scelto nelle impostazioni
const PROFILE_PAGES = {
  utm: { label: 'Generatore UTM', icon: '⛓' },
  calendario: { label: 'Calendario editoriale', icon: '▤' },
  palette: { label: 'Palette colori', icon: '◐' },
  font: { label: 'Font', icon: 'Aa' },
  shooting: { label: 'Shooting', icon: '◉' },
  lead: { label: 'Lead', icon: '☏' },
  preventivi: { label: 'Preventivi', icon: '€' },
  progetti: { label: 'Progetti', icon: '▦' },
  scadenze: { label: 'Scadenze', icon: '⏱' },
};
const PROFILES = [
  { id: 'smm', label: 'Social Media Manager', icon: '📱', pages: ['utm', 'calendario'] },
  { id: 'grafico', label: 'Grafico', icon: '🎨', pages: ['palette', 'font'] },
  { id: 'fotografo', label: 'Fotografo', icon: '📷', pages: ['shooting'] },
  { id: 'commerciale', label: 'Commerciale', icon: '💼', pages: ['lead', 'preventivi'] },
  { id: 'pm', label: 'Project Manager', icon: '📋', pages: ['progetti', 'scadenze'] },
];
const SETTINGS_PAGE = { id: 'settings', label: 'Impostazioni', icon: '⚙' };
const EDITABLE = new Set(['tools', 'idee', 'snippets', 'appunti', 'palette']);

const currentProfile = () => PROFILES.find((p) => p.id === state.settings.profile) || PROFILES[0];
const profilePages = () => currentProfile().pages.map((id) => ({ id, ...PROFILE_PAGES[id] }));
const visiblePages = () => [...COMMON_PAGES, ...profilePages(), SETTINGS_PAGE];

function navItem(p, extraClass = '') {
  return h('button', { class: `nav-item${p.id === page ? ' active' : ''}${extraClass}`, onclick: () => go(p.id) },
    h('span', { class: 'nav-icon' }, p.icon), p.label);
}

function renderNav() {
  const nav = $('#nav');
  nav.innerHTML = '';
  nav.append(
    ...COMMON_PAGES.map((p) => navItem(p)),
    h('div', { class: 'nav-section' }, currentProfile().label),
    ...profilePages().map((p) => navItem(p)),
    navItem(SETTINGS_PAGE, ' nav-bottom'));
}

function go(id) {
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
    palette: renderPalette, settings: renderSettings };
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

  const tile = h('div', { class: 'link-tile', role: 'button', tabindex: '0',
    onclick: (e) => { if (e.target.closest('.tile-actions')) return; window.api.openExternal(normalizeUrl(item.url)); },
    onkeydown: (e) => { if (e.key === 'Enter') window.api.openExternal(normalizeUrl(item.url)); },
    title: item.url },
    badge,
    h('div', { class: 'meta' }, h('div', { class: 'name' }, item.label), h('div', { class: 'sub' }, sub || hostOf(item.url))),
    (onEdit || onDelete) && h('div', { class: 'tile-actions' },
      onEdit && h('button', { class: 'icon', title: 'Modifica', onclick: onEdit }, '✎'),
      onDelete && h('button', { class: 'icon', title: 'Elimina', onclick: onDelete }, '✕'))
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
  view.append(h('div', { class: 'search' }, input, h('kbd', null, MOD_KEY)), h('div', { id: 'home-body' }));
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

  const datedPages = currentProfile().pages.filter((id) => RECORD_TYPES[id]?.upcoming);
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
    : h('div', { class: 'empty' }, 'Niente in sospeso. 🎉'));
}

function linkFields(l = {}) {
  return [
    { name: 'label', label: 'Etichetta', value: l.label || '', placeholder: 'Es. Admin WordPress' },
    { name: 'url', label: 'URL', value: l.url || '', placeholder: 'https://…' },
  ];
}

// --- STRUMENTI / LIBRERIE / IDEE (liste di link raggruppate per categoria)
function toolFields(t = {}) {
  return [
    { name: 'app', type: 'app', label: `${APP_KIND} (facoltativo)`, value: isAppUrl(t.url) ? appUrlToPath(t.url) : '' },
    ...linkFields(t),
    { name: 'category', label: 'Categoria', value: t.category || '', placeholder: 'Es. Marketing' },
    { name: 'icon', type: 'icon', label: 'Icona (emoji, URL o immagine)', value: t.icon || '', placeholder: 'Es. 🎨 oppure https://…/icon.png' }];
}
function renderLinkSection(view, key, { addLabel, singular }) {
  view.append(h('div', { class: 'row', style: 'margin-bottom:6px' },
    h('button', { class: 'primary', onclick: () => openForm({ title: `Nuovo ${singular}`, fields: toolFields(),
      onSubmit: (v) => {
        if (!v.label || !v.url) return false;
        state[key].push({ id: uid(), label: v.label, url: normalizeUrl(v.url), category: v.category || 'Altro', icon: v.icon || '' });
        save(); render();
      } }) }, `+ ${addLabel}`)));
  const list = state[key];
  const cats = [...new Set(list.map((t) => t.category))];
  if (!cats.length) view.append(h('div', { class: 'empty' }, `Nessun${singular.endsWith('a') ? 'a' : 'o'} ${singular}.`));
  for (const cat of cats) {
    view.append(h('div', { class: 'section-title' }, cat));
    view.append(h('div', { class: 'grid' }, list.filter((t) => t.category === cat).map((t) =>
      linkTile(t, {
        onEdit: () => openForm({ title: `Modifica ${singular}`, fields: toolFields(t),
          onSubmit: (v) => {
            if (!v.label || !v.url) return false;
            t.label = v.label; t.url = normalizeUrl(v.url); t.category = v.category || 'Altro'; t.icon = v.icon || ''; save(); render();
          } }),
        onDelete: () => { state[key] = state[key].filter((x) => x.id !== t.id); save(); render(); },
      }))));
  }
}
function renderTools(view) {
  renderLinkSection(view, 'tools', { addLabel: 'Nuovo strumento', singular: 'strumento' });
}

// --- IDEE (Librerie / Idee / Siti belli)
const IDEE_TABS = [
  { id: 'libraries', label: 'Librerie' },
  { id: 'ideas', label: 'Idee' },
  { id: 'sites', label: 'Siti belli' },
];
let ideeTab = 'libraries';
const capturingIds = new Set();

function renderIdee(view) {
  view.append(h('div', { class: 'subtabs' }, IDEE_TABS.map((t) =>
    h('button', { class: 'subtab' + (t.id === ideeTab ? ' active' : ''), onclick: () => { ideeTab = t.id; render(); } }, t.label))));
  const body = h('div', { class: 'subtab-body' });
  view.append(body);
  if (ideeTab === 'libraries') renderLinkSection(body, 'libraries', { addLabel: 'Nuova libreria', singular: 'libreria' });
  else if (ideeTab === 'ideas') renderLinkSection(body, 'ideaLinks', { addLabel: 'Nuova idea', singular: 'idea' });
  else renderSites(body);
}

function siteFields(s = {}) {
  return [
    { name: 'label', label: 'Etichetta', value: s.label || '', placeholder: 'Es. Nome del sito (opzionale)' },
    { name: 'url', label: 'URL', value: s.url || '', placeholder: 'https://…' },
  ];
}
function addSite() {
  openForm({ title: 'Nuovo sito', fields: siteFields(),
    onSubmit: (v) => {
      if (!v.url) return false;
      const url = normalizeUrl(v.url);
      const item = { id: uid(), label: v.label || deriveLabel(url), url, thumb: null, capturedAt: null };
      state.sites.push(item); save(); render();
      captureSite(item);
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
function renderIfSitesVisible() {
  if (page === 'idee' && ideeTab === 'sites') render();
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
async function captureAllMissing() {
  if (captureQueueRunning) return;
  captureQueueRunning = true;
  for (const s of state.sites.filter((s) => !s.thumb)) {
    if (page !== 'idee' || ideeTab !== 'sites') break;
    await captureSite(s);
  }
  captureQueueRunning = false;
}

function siteCard(s) {
  const capturing = capturingIds.has(s.id);
  const thumbInner = s.thumb
    ? h('img', { src: s.thumb, alt: '' })
    : h('div', { class: 'site-thumb-empty' }, capturing ? 'Cattura in corso…' : 'Nessuno screenshot');
  return h('div', { class: 'site-card' },
    h('button', { class: 'site-thumb', onclick: () => window.api.openExternal(normalizeUrl(s.url)), title: s.url }, thumbInner),
    h('div', { class: 'site-meta' },
      h('div', { class: 'site-name' }, s.label),
      h('div', { class: 'site-host' }, hostOf(s.url))),
    h('div', { class: 'site-actions' },
      h('button', { class: 'ghost small', disabled: capturing, onclick: () => captureSite(s) }, s.thumb ? 'Aggiorna' : 'Cattura'),
      editing && h('button', { class: 'icon', title: 'Modifica', onclick: () => editSite(s) }, '✎'),
      editing && h('button', { class: 'icon', title: 'Elimina', onclick: () => deleteSite(s) }, '✕')));
}
function renderSites(view) {
  const missing = state.sites.filter((s) => !s.thumb).length;
  view.append(h('div', { class: 'row', style: 'margin-bottom:6px' },
    h('button', { class: 'primary', onclick: addSite }, '+ Nuovo sito'),
    missing > 0 && h('button', { class: 'ghost small', onclick: captureAllMissing }, `Cattura mancanti (${missing})`)));
  if (!state.sites.length) view.append(h('div', { class: 'empty' }, 'Nessun sito salvato.'));
  view.append(h('div', { class: 'site-grid' }, state.sites.map((s) => siteCard(s))));
}

// --- TODO
function todoRow(t, rerender) {
  return h('div', { class: 'todo' + (t.done ? ' done' : '') },
    h('input', { type: 'checkbox', checked: t.done, onchange: (e) => { t.done = e.target.checked; save(); rerender(); } }),
    h('span', { class: 't' }, t.text),
    h('button', { class: 'icon', title: 'Elimina', onclick: () => { state.todos = state.todos.filter((x) => x.id !== t.id); save(); rerender(); } }, '✕'));
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
function appuntoForm(a) {
  const titleInput = h('input', { type: 'text', value: a?.title || '', placeholder: 'Es. Riunione cliente' });
  const dateInput = h('input', { type: 'date', value: a?.date || todayISO() });
  const rte = richTextInput(a?.html || '');
  const cancelBtn = h('button', { type: 'button', class: 'ghost', onclick: () => { appuntoFormFor = null; render(); } }, 'Annulla');
  const saveBtn = h('button', { type: 'button', class: 'primary', onclick: () => {
    const title = titleInput.value.trim();
    if (!title) return titleInput.focus();
    const html = rte.querySelector('.rte-content').innerHTML.trim();
    const date = dateInput.value || todayISO();
    if (a) { a.title = title; a.date = date; a.html = html; }
    else state.appunti.push({ id: uid(), title, date, html });
    appuntoFormFor = null; save(); render();
  } }, 'Salva');
  return h('div', { class: 'card appunto-form' },
    h('label', { class: 'field' }, h('span', null, 'Titolo'), titleInput),
    h('label', { class: 'field' }, h('span', null, 'Data'), dateInput),
    h('label', { class: 'field' }, h('span', null, 'Testo'), rte),
    h('div', { class: 'modal-actions' }, cancelBtn, saveBtn));
}
function renderAppunti(view) {
  view.append(h('div', { class: 'row', style: 'margin-bottom:14px' },
    h('button', { class: 'primary', onclick: () => { appuntoFormFor = appuntoFormFor === 'new' ? null : 'new'; render(); } },
      appuntoFormFor === 'new' ? 'Annulla' : '+ Nuovo appunto')));
  if (appuntoFormFor === 'new') view.append(appuntoForm(null));
  const list = [...state.appunti].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (!list.length && appuntoFormFor !== 'new') view.append(h('div', { class: 'empty' }, 'Nessun appunto.'));
  for (const a of list) {
    if (appuntoFormFor === a.id) { view.append(appuntoForm(a)); continue; }
    const body = h('div', { class: 'appunto-body' });
    body.innerHTML = a.html || '';
    view.append(h('div', { class: 'card appunto' },
      h('div', { class: 'card-head' },
        h('div', { style: 'flex:1; min-width:0' }, h('h3', null, a.title), h('div', { class: 'sub' }, formatDate(a.date))),
        editing && h('button', { class: 'icon', title: 'Modifica', onclick: () => { appuntoFormFor = a.id; render(); } }, '✎'),
        editing && h('button', { class: 'icon', title: 'Elimina', onclick: () => confirmBox(`Eliminare "${a.title}"?`, () => {
          state.appunti = state.appunti.filter((x) => x.id !== a.id); save(); render();
        }) }, '✕')),
      body));
  }
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
          onSubmit: (v) => { if (!v.title || !v.text) return false; s.title = v.title; s.text = v.text; save(); render(); } }) }, '✎'),
        editing && h('button', { class: 'icon', title: 'Elimina', onclick: () => confirmBox(`Eliminare "${s.title}"?`, () => {
          state.snippets = state.snippets.filter((x) => x.id !== s.id); save(); render();
        }) }, '✕')),
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
    !onOpen && editing && h('button', { class: 'icon', title: 'Modifica', onclick: () => editRecord(key, r) }, '✎'),
    !onOpen && editing && h('button', { class: 'icon', title: 'Elimina', onclick: () => deleteRecord(key, r) }, '✕'));
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
function readableOn(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#1d1d1b' : '#ffffff';
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
      editing && h('button', { class: 'icon', title: 'Modifica', onclick: () => editRecord('palette', p) }, '✎'),
      editing && h('button', { class: 'icon', title: 'Elimina', onclick: () => deleteRecord('palette', p) }, '✕'))))));
}

// ---------- Aspetto ----------
const PALETTES = [
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
  window.api.setAppearance({ theme: s.theme, bg: c.bg, fg: dark ? '#efeeea' : '#1d1d1b' });
}
darkQuery.addEventListener('change', () => state && applyAppearance());

// --- Icona dell'app: varianti di colore dell'icona originale o immagine caricata
const ICON_PRESETS = [
  { id: 'rosa', label: 'Rosa (originale)', color: null },
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
    img.src = '../build/icon.png';
  });
  return baseIcon;
}

// Ricolora lo sfondo dell'icona mantenendo bianco il "3" e l'ombra
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

  view.append(
    h('div', { class: 'section-title' }, 'Profilo'),
    h('div', { class: 'profile-grid' }, PROFILES.map((p) =>
      h('button', { class: 'profile-card' + (p.id === s.profile ? ' active' : ''), onclick: () => set({ profile: p.id }) },
        h('div', { class: 'profile-icon' }, p.icon),
        h('div', { class: 'profile-name' }, p.label),
        h('div', { class: 'profile-pages' }, p.pages.map((id) => PROFILE_PAGES[id].label).join(' · '))))),
    h('div', { class: 'hint' }, `Le sezioni ${COMMON_PAGES.map((p) => p.label).join(', ')} ci sono per tutti i profili. `
      + 'Cambiando profilo i dati delle altre sezioni restano salvati.'));

  view.append(
    h('div', { class: 'section-title' }, 'Tema'),
    h('div', { class: 'segmented' }, THEMES.map(([id, label]) =>
      h('button', { class: id === s.theme ? 'active' : '', onclick: () => set({ theme: id }) }, label))),
    h('div', { class: 'section-title' }, 'Colori'),
    h('div', { class: 'swatch-row' }, PALETTES.map((p) =>
      h('button', { class: 'palette-swatch' + (p.id === s.palette ? ' active' : ''), onclick: () => set({ palette: p.id }) },
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
    h('div', { class: 'hint' }, IS_WIN
      ? 'L\'icona cambia nella barra delle applicazioni e nel widget. Il collegamento sul Desktop e nel menu Start mantiene quella originale.'
      : 'L\'icona cambia nel Dock e nel widget mentre l\'app è aperta. Nel Finder e nel Launchpad resta quella originale.'));
}

// ---------- Aggiornamenti ----------
// I controlli periodici li fa il processo principale, che avvisa con 'update:available'
let updateInstalling = false;
let shownUpdateVersion = null;

function showUpdate(u) {
  const box = $('#update');
  if (updateInstalling) return; // i controlli periodici non devono azzerare l'avanzamento
  if (!u) { box.hidden = true; shownUpdateVersion = null; return; }
  if (u.version === shownUpdateVersion) return;
  shownUpdateVersion = u.version;
  const text = h('div', { class: 'update-text' }, 'Si installa da sola e l\'app si riapre: i tuoi dati restano.');
  const installBtn = h('button', { class: 'primary small', onclick: async () => {
    updateInstalling = true;
    installBtn.disabled = true;
    text.textContent = 'Download in corso…';
    await window.api.save(state); // salva subito le modifiche in sospeso: l'app sta per chiudersi
    const res = await window.api.installUpdate();
    if (res.ok) { text.textContent = 'Riavvio in corso…'; return; }
    updateInstalling = false;
    installBtn.disabled = false;
    text.replaceChildren(`Installazione automatica non riuscita (${res.error}). `,
      h('a', { href: '#', onclick: (e) => { e.preventDefault(); window.api.openExternal(u.downloadUrl); } }, 'Scarica a mano'));
  } }, 'Installa e riavvia');
  box.replaceChildren(
    h('div', { class: 'update-title' }, `Nuova versione ${u.version}`),
    text,
    h('div', { class: 'update-actions' },
      installBtn,
      h('button', { class: 'ghost small', onclick: () => window.api.openExternal(u.notesUrl) }, 'Novità')),
  );
  box.hidden = false;
  updateStatusEl = text;
}

let updateStatusEl = null;
function showUpdateProgress(p) {
  if (!updateInstalling || !updateStatusEl) return;
  updateStatusEl.textContent = p === 'install' ? 'Installazione…' : p >= 0 ? `Download… ${p}%` : 'Download in corso…';
}

// ---------- Boot ----------
function normalizeState(d) {
  d = d && typeof d === 'object' ? d : {};
  return {
    version: 1,
    tools: Array.isArray(d.tools) ? d.tools : [],
    libraries: Array.isArray(d.libraries) ? d.libraries : [],
    ideaLinks: Array.isArray(d.ideaLinks) ? d.ideaLinks : [],
    sites: Array.isArray(d.sites) ? d.sites : defaultSites(),
    todos: Array.isArray(d.todos) ? d.todos : [],
    notes: typeof d.notes === 'string' ? d.notes : '',
    appunti: Array.isArray(d.appunti) ? d.appunti : [],
    snippets: Array.isArray(d.snippets) ? d.snippets : [],
    ...Object.fromEntries(RECORD_KEYS.map((k) => [k, Array.isArray(d[k]) ? d[k] : []])),
    settings: normalizeSettings(d.settings),
  };
}

function normalizeSettings(s) {
  s = s && typeof s === 'object' ? s : {};
  const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
  return {
    profile: pick(s.profile, PROFILES.map((p) => p.id), 'smm'),
    theme: pick(s.theme, THEMES.map(([id]) => id), 'system'),
    palette: pick(s.palette, PALETTES.map((p) => p.id), 'rosa'),
    accent: /^#[0-9a-f]{6}$/i.test(s.accent) ? s.accent : '',
    iconId: typeof s.iconId === 'string' ? s.iconId : 'rosa',
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
  render();
  window.api.onUpdate(showUpdate);
  window.api.onUpdateProgress(showUpdateProgress);
  window.api.checkUpdate().then(showUpdate);
}
boot();
