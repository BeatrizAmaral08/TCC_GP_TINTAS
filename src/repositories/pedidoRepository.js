import { connection } from "../configs/Database.js";

const pedidoRepository = {

    criar: async (pedido, itens) => {
        const conn = await connection.getConnection();

        try {
            await conn.beginTransaction();

            //confere que itens existe
            itens = itens || [];

            let subTotal = 0;

            //calcula o subtotal
            for (const item of itens) {

                const [produtoRows] = await conn.execute(
                    'SELECT valor FROM produtos WHERE idProduto = ?',
                    [item.produtoId]
                );

                if (!produtoRows || produtoRows.length === 0) {
                    throw new Error(`Produto ${item.produtoId} não encontrado`);
                }

                const valorItem = produtoRows[0].valor;
                const quantidade = item.quantidade ?? 0;
                subTotal = subTotal + (valorItem * quantidade);
            }

            const sqlPed = `
                INSERT INTO pedidos (clienteId, SubTotal, Status)
                VALUES (?, ?, ?)
            `;

            const valuesPed = [
                pedido.clienteId ?? null,
                subTotal ?? 0,
                pedido.status ?? "ABERTO"
            ];

            const [rowsPed] = await conn.execute(sqlPed, valuesPed);

            for (const item of itens) {

                const [produtoRows] = await conn.execute(
                    'SELECT valor FROM produtos WHERE idProduto = ?',
                    [item.produtoId]
                );

                if (!produtoRows || produtoRows.length === 0) {
                    throw new Error(`Produto ${item.produtoId} não encontrado`);
                }

                const valorItem = produtoRows[0].valor;

                const sqlItens = `
                    INSERT INTO itens_pedidos
                    (PedidoId, ProdutoId, Quantidade, ValorItem)
                    VALUES (?, ?, ?, ?)
                `;

                await conn.execute(sqlItens, [
                    rowsPed.insertId,
                    item.produtoId,
                    item.quantidade ?? 0,
                    valorItem
                ]);
            }

            await conn.commit();

            return rowsPed;

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },

    selecionar: async (idPedido) => {
    const conn = await connection.getConnection();

    try {
        let sql = `
            SELECT *
            FROM pedidos AS p
            INNER JOIN clientes AS c
                ON p.ClienteId = c.idCliente  
            LEFT JOIN itens_pedidos AS i
                ON i.PedidoId = p.id
        `;

        const params = [];

        if (idPedido) {
            sql = sql + " WHERE p.id = ?";
            params.push(idPedido);
        }

        const [rows] = await conn.execute(sql, params);

        return rows;

    } finally {
        conn.release();
    }
},

    adicionarItem: async (pedidoId, item) => {
        const conn = await connection.getConnection();

        try {
            await conn.beginTransaction();

            const [produtoRows] = await conn.execute(
                'SELECT valor FROM produtos WHERE idProduto = ?',
                [item.produtoId]
            );

            if (!produtoRows || produtoRows.length === 0) {
                throw new Error(`Produto ${item.produtoId} não encontrado`);
            }

            const valorItem = produtoRows[0].valor;

            const sql = `
                INSERT INTO itens_pedidos
                (PedidoId, ProdutoId, Quantidade, ValorItem)
                VALUES (?, ?, ?, ?)
            `;

            await conn.execute(sql, [
                pedidoId,
                item.produtoId,
                item.quantidade ?? 0,
                valorItem
            ]);

            await conn.commit();

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },

    editar: async (pedidoId, status) => {
        const conn = await connection.getConnection();

        try {
            await conn.beginTransaction();

            const sql = `UPDATE pedidos SET Status = ? WHERE id = ?`;

            await conn.execute(sql, [status, pedidoId]);

            await conn.commit();

            return { message: "Pedido atualizado com sucesso" };

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },

    buscarPorId: async (id) => {
        const sql = 'SELECT * FROM pedidos WHERE id = ?';
        const [rows] = await connection.execute(sql, [id]);

        return rows.length > 0 ? rows[0] : null;
    },

    buscarItensPorPedido: async (pedidoId) => {
        const sql = `SELECT * FROM itens_pedidos WHERE PedidoId = ?`;
        const [rows] = await connection.execute(sql, [pedidoId]);
        return rows;
    },

   deletar: async (pedidoId) => {
    const conn = await connection.getConnection();

    try {
        await conn.beginTransaction();

        await conn.execute(
            "DELETE FROM itens_pedido WHERE PedidoId = ?",
            [pedidoId]
        );

        // remove pedido
        await conn.execute(
            "DELETE FROM pedidos WHERE id = ?",
            [pedidoId]
        );

        await conn.commit();

    } catch (error) {
        await conn.rollback();
        throw error;

    } finally {
        conn.release();
    }
},

    atualizarSubtotal: async (pedidoId, subTotal) => {
        const sql = `UPDATE pedidos SET SubTotal = ? WHERE id = ?`;
        await connection.execute(sql, [subTotal, pedidoId]);
    },

    atualizarStatus: async (pedidoId, status) => {
        const sql = `UPDATE pedidos SET Status = ? WHERE id = ?`;
        await connection.execute(sql, [status, pedidoId]);
    },
};

export default pedidoRepository;