// Enlaces externos ya confirmados por el cliente (no dependen de subir nada a
// Supabase Storage). Se hardcodean porque son datos finales de la base de
// conocimiento; si el cliente los actualiza, se edita este archivo.

export const YOUTUBE_TRAMPA = [
  { label: 'Video de trampas de grasa 1', url: 'https://youtube.com/shorts/_5is5qqznIs' },
  { label: 'Video de trampas de grasa 2', url: 'https://youtube.com/shorts/j4h08oz-uJg' },
];

// Videos de referencia por producto del hogar — se ofrecen cuando el cliente
// pide un video y el archivo pesa demasiado para mandarlo como adjunto.
export const YOUTUBE_HOGAR = {
  eliminadorTuberias: 'https://youtube.com/shorts/_w95FoeZAS0?si=kjg_6aHi0Zjus8Gm',
  bluePoop: 'https://youtube.com/shorts/QZMah7Ly9U0?si=J5ed8EskESyIwW72',
  antioloresMascotas: 'https://youtube.com/shorts/iYuL5HP_lAs?si=Zjcrq9Femj3Ejr-B',
};

export const PUNTOS_VENTA_MERIDA = {
  papeleriaElReinoDelSaber: {
    producto: 'Eliminador de Olores para Tuberías',
    maps: 'https://maps.app.goo.gl/6K1xpoKrqZAsxA986',
  },
  tlapaleriaAndrea: {
    producto: 'Eliminador de Olores para Tuberías',
    maps: 'https://maps.app.goo.gl/sS9bM9Z9KVVETrn66?g_st=awb',
  },
  veterinariaCannaPets: {
    producto: 'Antiolores de Mascotas',
    maps: 'https://maps.app.goo.gl/oCGwbZQmerVYayF97?g_st=awb',
  },
  centroVeterinarioSaludAnimal: {
    producto: 'Antiolores de Mascotas',
    maps: 'https://maps.app.goo.gl/6NougTjiYdVyFQSV9?g_st=awb',
  },
  abarrotesCarmita: {
    producto: 'Antiolores de Mascotas, Eliminador de Olores para Tuberías, Blue Poop',
    maps: 'https://maps.app.goo.gl/dfa41Yx7kyZkzeNU7?g_st=awb',
  },
};

export const ENLACES_COMPRA = {
  eliminadorTuberias: {
    tiktok: 'https://vt.tiktok.com/ZS9kKkH7WtUwm-c4GjT/',
    mercadoLibre: 'https://www.mercadolibre.com.mx/eliminador-de-olores-para-tuberias/up/MLMU3112269569',
    walmart:
      'https://www.walmart.com.mx/ip/Kit-Blue-Drop-Eliminador-de-Olores-Tuberias-1L-3-Refill-500ml/00843188600232',
  },
  antioloresMascotas: {
    tiktok: 'https://vt.tiktok.com/ZS9BrtpcnM9Xs-8b5ug/',
    mercadoLibre: 'https://www.mercadolibre.com.mx/anti-olores-mascotas-blue-drop/up/MLMU3222768018',
    walmart:
      'https://www.walmart.com.mx/ip/Kit-Antiolores-Mascotas-Blue-Drop-470ml-olor-Madera-Refill-Madera-y-Gardenia-500ml/00072984918006',
  },
  bluePoop: {
    tiktok: 'https://vt.tiktok.com/ZS9Brt7jYEw6T-mbCco/',
    mercadoLibre: 'https://www.mercadolibre.com.mx/toilet-spray--combo-doble-bluepoop/up/MLMU3334718897',
    walmart: 'https://www.walmart.com.mx/ip/Kit-Blue-Poop-Spray-Neutralizador-4-pzs/00571415618619',
  },
  blueDropShock: {
    tiktok: 'https://vt.tiktok.com/ZS9BrWpoA5wSB-muQzD/',
    mercadoLibre:
      'https://www.mercadolibre.com.mx/tratamiento-shock-blue-drop-para-trampa-de-grasa-20-l/up/MLMU3496257306',
  },
};
