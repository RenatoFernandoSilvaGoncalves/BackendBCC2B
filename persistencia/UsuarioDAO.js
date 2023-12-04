import Usuario from "../modelo/usuario.js";
import conectarBanco, { liberarConexao } from "../persistencia/conexao.js";
import Mensagem from "../modelo/mensagens.js";

export default class UsuarioDAO {
    async gravar(usuario) {
        if (usuario instanceof Usuario) {
            const sql = "INSERT INTO usuario (usuario, urlAvatar, dataIngresso) VALUES (?, ?, STR_TO_DATE(?, '%d/%m/%Y'))";
            const data = new Date(usuario.dataIngresso);
            const parametros = [usuario.nickname, usuario.urlAvatar, data.toLocaleDateString("pt-BR")];
            const conexao = await conectarBanco();
            const resultado = await conexao.execute(sql, parametros);
            usuario.id = resultado[0].insertId;
            liberarConexao(conexao);
        }
    }

    async alterar(usuario) {
        if (usuario instanceof Usuario) {
            const sql = "UPDATE usuario SET usuario = ?, urlAvatar = ? WHERE id = ?";
            const parametros = [usuario.nickname, usuario.urlAvatar, usuario.id];
            const conexao = await conectarBanco();
            await conexao.execute(sql, parametros);
            liberarConexao(conexao);
        }
    }

    async excluir(usuario) {
        if (usuario instanceof Usuario) {
            const sql = "DELETE FROM usuario WHERE id = ?";
            const conexao = await conectarBanco();
            await conexao.execute(sql, [usuario.id]);
            liberarConexao(conexao);
        }
    }

    async consultar(termo) {
        let sql = "";
        let parametros = [];
        if (isNaN(parseInt(termo || ""))) {
            sql = `SELECT u.id, u.usuario, u.urlAvatar, u.dataIngresso,
            m.id as id_mensagem, m.dataHora, m.lida, m.mensagem, m.id_usuario 
            FROM usuario u
            LEFT JOIN mensagens m ON u.id = m.id_usuario
            WHERE u.usuario LIKE ?
            ORDER BY m.dataHora ASC`;
            parametros.push(`%${termo}%`);
        } else {
            sql = sql = `SELECT u.id, u.usuario, u.urlAvatar, u.dataIngresso,
                         m.id as id_mensagem, m.dataHora, m.lida, m.mensagem, m.id_usuario 
            FROM usuario u
            LEFT JOIN mensagens m ON u.id = m.id_usuario
            WHERE u.id = ?
            ORDER BY m.dataHora ASC`;;
            parametros.push(termo);
        }

        const conexao = await conectarBanco();
        const [linhas, campos] = await conexao.execute(sql, parametros);
        const registros = linhas.reduce((grupos, item) => {
            const grupo = grupos[item.id] || [];
            grupo.push(item);
            grupos[item.id] = grupo;
            return grupos;
        }, {});

        let usuarios = [];
        for (const [key, registro] of Object.entries(registros)) {
            let mensagens = [];
            for (const linha of registro) {
                if (linha.id_mensagem){
                    const mensagem = new Mensagem(linha.id_mensagem, linha.lida, linha.mensagem, linha.dataHora, {});
                    mensagens.push(mensagem);
                }
            }
            const usuario = new Usuario(registro[0].id, registro[0].usuario, registro[0].urlAvatar, registro[0].dataIngresso, mensagens);
            usuarios.push(usuario)
        }
        liberarConexao(conexao);
        return usuarios;
    }
}
