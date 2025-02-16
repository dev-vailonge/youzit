export default async function handler(req, res) {
    // Permitir requisições de qualquer origem (Ajuste para segurança em produção)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Tratamento da requisição OPTIONS (preflight)
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido" });
    }

    const { email } = req.body;
    const githubToken = process.env.GITHUB_TOKEN; // Variável de ambiente
    const repoOwner = "SEU_USERNAME";
    const repoName = "SEU_REPOSITORIO";
    const filePath = "emails.csv";

    // Buscar o conteúdo atual do arquivo
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
        headers: { Authorization: `Bearer ${githubToken}` }
    });

    const fileData = await response.json();
    const content = Buffer.from(fileData.content, "base64").toString("utf-8");

    // Adiciona o novo e-mail
    const newContent = `${content}\n${email}`;
    const encodedContent = Buffer.from(newContent).toString("base64");

    // Atualiza o arquivo no GitHub
    await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${githubToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "Adicionando e-mail à waiting list",
            content: encodedContent,
            sha: fileData.sha
        })
    });

    return res.json({ message: "E-mail cadastrado no GitHub!" });
}
