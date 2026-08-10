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

// Il corpo della richiesta va letto senza dare per scontato che il runtime
// lo abbia già decodificato: a seconda della configurazione req.body può
// essere un oggetto, una stringa, un Buffer oppure mancare del tutto.
function leggiCorpo(req) {
  return new Promise((risolvi, rifiuta) => {
    const b = req.body;
    if (Buffer.isBuffer(b)) return risolvi({ testo: b.toString("utf8"), via: "buffer" });
    if (typeof b === "string") return risolvi({ testo: b, via: "stringa" });
    if (b && typeof b === "object") return risolvi({ oggetto: b, via: "oggetto" });
    let dati = "";
    req.setEncoding("utf8");
    req.on("data", (c) => { dati += c; });
    req.on("end", () => risolvi({ testo: dati, via: "flusso" }));
    req.on("error", rifiuta);
  });
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
      const letto = await leggiCorpo(req);
      let corpo = letto.oggetto;
      if (!corpo) {
        try {
          corpo = JSON.parse(letto.testo || "");
        } catch (e) {
          return json(res, 400, {
            errore: `corpo illeggibile (via ${letto.via}, ${(letto.testo || "").length} byte)`,
          });
        }
      }
      if (!corpo || typeof corpo.cifrato !== "string") {
        return json(res, 400, {
          errore: `manca il campo cifrato (via ${letto.via}, chiavi: ${
            corpo ? Object.keys(corpo).join("|") || "nessuna" : "nullo"
          })`,
        });
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
