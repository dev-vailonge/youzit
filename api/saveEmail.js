export default async function handler(req, res) {
  // Permitir requisições de qualquer origem (para desenvolvimento)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Tratamento da requisição OPTIONS (preflight request do CORS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "E-mail é obrigatório" });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const repoOwner = "dev-vailonge";
    const repoName = "youzit";
    const filePath = "emails.csv";

    // Buscar conteúdo do arquivo no GitHub
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
      {
        headers: { Authorization: `Bearer ${githubToken}` },
      }
    );

    if (!response.ok) throw new Error("Erro ao acessar o GitHub");

    const fileData = await response.json();
    const content = Buffer.from(fileData.content, "base64").toString("utf-8");

    // Adiciona o novo e-mail
    const newContent = `${content}\n${email}`;
    const encodedContent = Buffer.from(newContent).toString("base64");

    // Atualiza o arquivo no GitHub
    const updateResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Adicionando e-mail à waiting list",
          content: encodedContent,
          sha: fileData.sha,
        }),
      }
    );

    if (!updateResponse.ok) throw new Error("Erro ao atualizar o GitHub");

    return res.json({ message: "E-mail cadastrado no GitHub!" });
  } catch (error) {
    console.error("Erro:", error);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}
