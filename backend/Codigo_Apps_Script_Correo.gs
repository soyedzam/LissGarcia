/**
 * CERTIFICACIÓN CAPILAR · Liss García  —  CEREBRO (Apps Script)
 * Hace 3 cosas con un solo despliegue:
 *   1) Envía el correo de certificación desde el Gmail de Liss (gratis).
 *   2) Guarda cada registro (nombre + correo) en una hoja de Drive (para newsletter).
 *   3) Evalúa las respuestas abiertas con IA (Gemini) y devuelve calificación + feedback.
 *
 * ───────── PUBLICARLO (una sola vez) ─────────
 *  1) https://script.google.com con el Gmail de Liss → Nuevo proyecto.
 *  2) Borra todo y pega ESTE código. Guarda.
 *  3) Consigue tu llave de Gemini GRATIS en https://aistudio.google.com  (Get API key).
 *  4) En Apps Script: ⚙ Configuración del proyecto → "Propiedades del script" →
 *       Agregar propiedad:  nombre = GEMINI_KEY   valor = TU_LLAVE
 *  5) Implementar → Nueva implementación → "Aplicación web"
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: Cualquier usuario
 *     Implementar → autoriza permisos (Gmail + Hojas + conexión externa).
 *  6) Copia la "URL de la aplicación web" y pégala en la app:
 *       CONFIG.email.appsScriptUrl = "TU_URL_AQUI"
 *
 *  La hoja se crea sola en el Drive de Liss:
 *      "Liss García · Registros Certificación"
 *      Fecha | Hora | Nombre | Correo | Examen | Versión | Estado | Score | Aciertos | Folio | Promesa | Dispositivo
 */

// El nombre del modelo puede cambiar con el tiempo. Si Gemini actualiza versiones,
// edítalo aquí (ver modelos disponibles en https://aistudio.google.com).
var GEMINI_MODEL = 'gemini-2.0-flash';

/* ============ 1 y 2 · CORREO + DRIVE (POST) ============ */
function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    // Mensaje de contacto desde el Home → hoja "Contactos" + aviso a Liss
    if (d.action === 'contact') {
      contactRow_(d);
      var liss = 'liszi.garcia@gmail.com'; // [editable] destinatario del aviso
      GmailApp.sendEmail(liss,
        '✉️ Nuevo contacto desde el sitio — ' + (d.to_name || ''),
        'Nombre: ' + (d.to_name || '') + '\nCorreo: ' + (d.to_email || '') + '\n\nMensaje:\n' + (d.message || ''),
        { name: 'Sitio Liss García', replyTo: d.to_email || '' });
      return json_({ ok: true });
    }
    logRow_(d);                                   // guarda SIEMPRE en Drive
    if ((d.action || 'result') !== 'register') {  // en el resultado, además envía el correo
      GmailApp.sendEmail(
        d.to_email,
        '🎓 ' + d.to_name + ', tu Certificación Capilar Liss García',
        'Felicidades ' + d.to_name + '. Calificación: ' + d.score + ' — ' + d.status,
        { name: 'Liss García · Certificación Capilar', bcc: d.bcc || '', htmlBody: buildHtml_(d) }
      );
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function contactRow_(d) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('CONTACT_SHEET_ID');
  var ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('Liss García · Contactos del sitio');
    props.setProperty('CONTACT_SHEET_ID', ss.getId());
    var sh = ss.getSheets()[0];
    sh.appendRow(['Fecha', 'Hora', 'Nombre', 'Correo', 'Mensaje']);
    sh.setFrozenRows(1);
    sh.getRange('A1:E1').setFontWeight('bold').setBackground('#1a1812').setFontColor('#E7CB85');
  }
  var now = new Date(), tz = Session.getScriptTimeZone();
  ss.getSheets()[0].appendRow([
    Utilities.formatDate(now, tz, 'dd/MM/yyyy'),
    Utilities.formatDate(now, tz, 'HH:mm'),
    d.to_name || '', d.to_email || '', d.message || ''
  ]);
}

/* ============ 3 · EVALUACIÓN CON IA (GET · JSONP) ============ */
function doGet(e) {
  var p = e.parameter || {};
  if (p.action === 'grade') {
    var out;
    try { out = gradeWithGemini_(p.q || '', p.model || '', p.answer || ''); }
    catch (err) { out = { ok: false, correct: true, feedback: '', error: String(err) }; }
    var body = (p.callback || 'callback') + '(' + JSON.stringify(out) + ')';
    return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput('ok');
}

function gradeWithGemini_(pregunta, modelo, respuesta) {
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');
  if (!key) return { ok: false, correct: true, feedback: '' }; // sin llave: no castigamos

  var prompt =
    'Eres una instructora experta en tricología y alisados capilares, cálida y justa. ' +
    'Evalúa la respuesta de una alumna comparándola con la respuesta modelo. ' +
    'Sé GENEROSA: si captó la idea principal, aunque use sinónimos o redacción distinta, márcala como correcta. ' +
    'Devuelve SOLO un JSON válido con esta forma exacta: {"correct": true, "feedback": "1-2 frases en español, motivadoras y específicas"}.\n\n' +
    'Pregunta: ' + pregunta + '\n' +
    'Respuesta modelo: ' + modelo + '\n' +
    'Respuesta de la alumna: ' + respuesta;

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + key;
  var payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
  };
  var res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify(payload), muteHttpExceptions: true
  });

  var data = JSON.parse(res.getContentText());
  var txt = data && data.candidates && data.candidates[0] &&
            data.candidates[0].content && data.candidates[0].content.parts[0].text || '';
  var parsed = {};
  try { parsed = JSON.parse(txt); } catch (e2) { parsed = { correct: true, feedback: '' }; }
  return {
    ok: true,
    correct: parsed.correct === true,
    feedback: parsed.feedback || ''
  };
}

/* ============ HELPERS ============ */
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  var ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('Liss García · Registros Certificación');
    props.setProperty('SHEET_ID', ss.getId());
    var sh0 = ss.getSheets()[0];
    sh0.appendRow(['Fecha', 'Hora', 'Nombre', 'Correo', 'Examen', 'Versión', 'Estado', 'Score', 'Aciertos', 'Folio', 'Promesa', 'Dispositivo']);
    sh0.setFrozenRows(1);
    sh0.getRange('A1:L1').setFontWeight('bold').setBackground('#1a1812').setFontColor('#E7CB85');
    sh0.setColumnWidth(4, 220); // Correo
    sh0.setColumnWidth(5, 200); // Examen
  }
  return ss.getSheets()[0];
}

function logRow_(d) {
  var now = new Date();
  var tz = Session.getScriptTimeZone();
  var fecha = Utilities.formatDate(now, tz, 'dd/MM/yyyy');
  var hora  = Utilities.formatDate(now, tz, 'HH:mm');
  var estado = (d.action === 'register') ? 'Registrada' : (d.status || '');
  var promesa = (d.promesa && d.promesa !== '—') ? d.promesa : '';
  getSheet_().appendRow([
    fecha, hora, d.to_name || '', d.to_email || '',
    d.examen || '', d.version || '', estado,
    d.score || '', d.aciertos || '', d.folio || '', promesa, d.device || ''
  ]);
}

function buildHtml_(d) {
  var aprob = (d.status || '').toUpperCase().indexOf('APROB') === 0;
  return ''
  + '<div style="margin:0;padding:0;background:#0A0A0C;font-family:Arial,Helvetica,sans-serif">'
  +   '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0C"><tr><td align="center" style="padding:34px 18px">'
  +     '<table role="presentation" width="100%" style="max-width:560px;background:#111014;border:1px solid #2a2722;border-radius:18px;overflow:hidden">'
  +       '<tr><td align="center" style="padding:34px 30px 6px">'
  +         '<div style="font-family:Georgia,serif;font-size:30px;color:#D9B45B;letter-spacing:.5px">Liss García</div>'
  +         '<div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#A8842E;margin-top:6px">' + (d.area || 'Tricología & Alisados Capilares') + '</div>'
  +         '<div style="font-size:10px;letter-spacing:1px;color:#7a6f55;margin-top:6px">' + (d.centro || '') + '</div>'
  +       '</td></tr>'
  +       '<tr><td align="center" style="padding:16px 34px 4px">'
  +         '<div style="font-family:Georgia,serif;font-size:26px;color:#F5F1E8">' + (aprob ? '¡Felicidades, ' + d.to_name + '!' : 'Hola, ' + d.to_name) + '</div>'
  +         '<p style="color:#bdb6a8;font-size:16px;line-height:1.6;margin:14px 0">'
  +           (aprob
              ? 'Completaste tu <b style="color:#E7CB85">' + d.cert + '</b> y obtuviste tu <b style="color:#E7CB85">Certificación y Título oficial</b>.'
              : 'Gracias por presentar tu <b style="color:#E7CB85">' + d.cert + '</b>. Estás muy cerca — repasa y vuelve a intentarlo.')
  +         '</p>'
  +       '</td></tr>'
  +       '<tr><td align="center" style="padding:4px 34px 20px">'
  +         '<table role="presentation" style="background:#1a1812;border:1px solid #3a3320;border-radius:12px"><tr>'
  +           '<td style="padding:14px 22px;text-align:center"><div style="font-size:11px;color:#8a7c58;letter-spacing:1px">CALIFICACIÓN</div><div style="font-family:Georgia,serif;font-size:21px;color:#E7CB85">' + d.score + '</div></td>'
  +           '<td style="padding:14px 22px;text-align:center;border-left:1px solid #3a3320"><div style="font-size:11px;color:#8a7c58;letter-spacing:1px">FECHA</div><div style="font-family:Georgia,serif;font-size:17px;color:#F5F1E8">' + d.fecha + '</div></td>'
  +           '<td style="padding:14px 22px;text-align:center;border-left:1px solid #3a3320"><div style="font-size:11px;color:#8a7c58;letter-spacing:1px">FOLIO</div><div style="font-family:Georgia,serif;font-size:16px;color:#F5F1E8">' + d.folio + '</div></td>'
  +         '</tr></table>'
  +       '</td></tr>'
  +       '<tr><td align="center" style="padding:0 34px 28px">'
  +         (d.promesa && d.promesa !== '—' ? '<p style="color:#bdb6a8;font-size:15px;line-height:1.6;font-style:italic">Tu promesa de hoy: “' + d.promesa + '”</p>' : '')
  +         '<p style="color:#8a8275;font-size:12px;margin-top:20px">Designed by Soul Lens · Powered by Xplorers Startups</p>'
  +       '</td></tr>'
  +     '</table>'
  +   '</td></tr></table>'
  + '</div>';
}
