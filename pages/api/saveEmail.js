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
    if (!githubToken) {
      console.error("GitHub token not found");
      return res
        .status(500)
        .json({ error: "Configuração do servidor incompleta" });
    }

    const repoOwner = "dev-vailonge";
    const repoName = "youzit";
    const filePath = "emails.csv";

    // First try to get the file
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      console.error("GitHub API Error:", await response.text());
      return res.status(500).json({
        error: "Erro ao acessar lista de emails. Por favor, tente novamente.",
      });
    }

    const fileData = await response.json();
    let content = "";

    try {
      content = Buffer.from(fileData.content, "base64").toString("utf-8");
    } catch (error) {
      console.error("Error decoding content:", error);
      return res.status(500).json({
        error: "Erro ao processar lista de emails",
      });
    }

    // Add new email
    const newContent = content
      ? `${content.trim()}\n${email}`
      : `email\n${email}`;
    const encodedContent = Buffer.from(newContent).toString("base64");

    // Update file
    const updateResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Adicionando email: ${email}`,
          content: encodedContent,
          sha: fileData.sha,
        }),
      }
    );

    if (!updateResponse.ok) {
      console.error("GitHub Update Error:", await updateResponse.text());
      return res.status(500).json({
        error: "Erro ao salvar email. Por favor, tente novamente.",
      });
    }

    return res.json({ message: "Email cadastrado com sucesso!" });
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({
      error: "Erro ao processar sua solicitação. Por favor, tente novamente.",
    });
  }
}
