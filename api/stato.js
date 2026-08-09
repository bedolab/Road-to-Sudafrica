// Archivio dello stato personale della checklist.
//
// Conserva un unico documento su un gist privato. Il contenuto arriva già cifrato
// dal browser con la passphrase dell'area riservata: qui transita e viene salvato
// come testo opaco, mai interpretato. Il token di scrittura vive dentro il
// contenuto cifrato della pagina, quindi è disponibile solo dopo lo sblocco.
//
// Variabili d'ambiente richieste su Vercel:
//   GIST_ID       identificativo del gist privato
//   GITHUB_TOKEN  token con permesso di scrittura sui gist
//   SYNC_TOKEN    segreto condiviso con la pagina, generato dal builder

const NOME_FILE = "stato.json";

function json(res, codice, corpo) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.status(codice).send(JSON.stringify(corpo));
}

async function gist(metodo, corpo) {
  const r = await fetch(`https://api.github.com/gists/${process.env.GIST_ID}`, {
    method: metodo,
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "road-to-sudafrica",
      ...(corpo ? { "content-type": "application/json" } : {}),
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`gist ${r.status}: ${t.slice(0, 200)}`);
  }
  return r.json();
}

module.exports = async (req, res) => {
  if (!process.env.GIST_ID || !process.env.GITHUB_TOKEN || !process.env.SYNC_TOKEN) {
    return json(res, 500, { errore: "configurazione incompleta sul server" });
  }

  try {
    if (req.method === "GET") {
      const g = await gist("GET");
      const f = g.files && g.files[NOME_FILE];
      if (!f || !f.content) return json(res, 200, { vuoto: true });
      let dati;
      try {
        dati = JSON.parse(f.content);
      } catch (e) {
        return json(res, 200, { vuoto: true });
      }
      return json(res, 200, dati);
    }

    if (req.method === "PUT") {
      if (req.headers["x-sync-token"] !== process.env.SYNC_TOKEN) {
        return json(res, 403, { errore: "token non valido" });
      }
      // req.body arriva già decodificato quando il content-type è json
      const corpo = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!corpo || typeof corpo.cifrato !== "string") {
        return json(res, 400, { errore: "corpo non valido" });
      }
      const doc = { cifrato: corpo.cifrato, ts: Number(corpo.ts) || Date.now() };
      await gist("PATCH", {
        files: { [NOME_FILE]: { content: JSON.stringify(doc) } },
      });
      return json(res, 200, { ok: true, ts: doc.ts });
    }

    res.setHeader("allow", "GET, PUT");
    return json(res, 405, { errore: "metodo non consentito" });
  } catch (e) {
    return json(res, 502, { errore: String(e.message || e) });
  }
};
