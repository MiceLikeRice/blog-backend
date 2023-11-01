const express = require("express");
const router = express.Router();
const mysql = require("../config/db.js");

// 获取博客列表（带分页功能）
// 获取博客列表（带分页和查询功能）
// 获取博客列表（带分页、查询和分类功能）


// 合并处理程序
const handleRequest = async (req, res, query, params,first) => {
    let connection; // 声明连接对象

    try {
        connection = await mysql.getConnection(); // 从连接池获取连接
        const [result] = await connection.query(query, params);
        console.log(result);
        if (result.length >= 0||result.affectedRows>0||result.changedRows>0) {
            if(first)res.send(result[0]);
            else res.send(result);
        } else {
            res.status(404).send("Blog not found");
        }
    } catch (error) {
        console.error("Error in route:", error);
        res.status(500).send("Internal Server Error");
    } finally {
        if (connection) {
            connection.release(); // 释放连接
        }
    }
};

router.get("/blogcount", async (req, res) => {


    let query = "SELECT count(*) as total FROM blog";
    
    // 检查是否有查询参数
    if (req.query.search) {
        const search = req.query.search;
        query += ` WHERE title LIKE '%${search}%' `;
    }

    // 检查是否有类型参数
    if (req.query.type) {
        const type = req.query.type;
        if (query.includes("WHERE")) {
            query += ` AND content_type = '${type}'`;
        } else {
            query += ` WHERE content_type = '${type}' `;
        }
    }

    // 添加删除条件
    if (query.includes("WHERE")) {
        query += ` AND deleted = 0`;
    } else {
        query += ` WHERE deleted = 0`;
    }
    await handleRequest(req, res,query,[],true);
});

// 获取博客列表
router.get("/allblog", async (req, res) => {
    const page = req.query.page || 1;
    console.log(req.query);
    const perPage = 10; // 每页显示的博客数量
    const offset = (page - 1) * perPage;
    let query = "SELECT blog_id, title, view_count, outline, upload_date, author, content_type, cover_image FROM blog";
    
    // 检查是否有查询参数
    if (req.query.search) {
        const search = req.query.search;
        query += ` WHERE title LIKE '%${search}%' `;
    }

    // 检查是否有类型参数
    if (req.query.type) {
        const type = req.query.type;
        if (query.includes("WHERE")) {
            query += ` AND content_type = '${type}'`;
        } else {
            query += ` WHERE content_type = '${type}' `;
        }
    }

    // 添加删除条件
    if (query.includes("WHERE")) {
        query += ` AND deleted = 0`;
    } else {
        query += ` WHERE deleted = 0`;
    }
    query+=" order by update_date desc";
    query += ` LIMIT ${offset}, ${perPage}`;
    console.log(query);
    await handleRequest(req, res, query,[],false);
});

// 获取单篇博客
router.get("/:id", async (req, res) => {
    const blogId = req.params.id;
    const query = "SELECT * FROM blog WHERE blog_id = ?";
    handleRequest(req, res, query, [blogId],true);
});

// 创建新博客
router.post("/create", async (req, res) => {
    const { title, outline, body, author, content_type, cover_image } = req.body;
    const query = "INSERT INTO blog (title, outline, body, author, content_type,cover_image,deleted,upload_date,update_date) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(),NOW())";
    let connection; // 声明连接对象

    try {
        connection = await mysql.getConnection(); // 从连接池获取连接
        const [result] = await connection.query(query, [title, outline, body, author, content_type, cover_image, 0]);
        if (result.length >= 0||result.affectedRows>0||result.changedRows>0) {
            console.log(result)
            res.send({blog_id:result.insertId});
        } else {
            res.status(404).send("Blog not found");
        }
    } catch (error) {
        console.error("Error in route:", error);
        res.status(500).send("Internal Server Error");
    } finally {
        if (connection) {
            connection.release(); // 释放连接
        }
    }
});

// 更新博客
router.put("/update/:id", async (req, res) => {
    const blogId = req.params.id;
    const { title, outline, body, author, content_type, cover_image } = req.body;
    const query = "UPDATE blog SET title = ?, outline = ?, body = ?, author = ?, content_type = ?,cover_image= ?,update_date=NOW() WHERE blog_id = ?";
    handleRequest(req, res, query, [title, outline, body, author, content_type, cover_image, blogId],false);
});

// 删除博客
router.put("/delete/:id", async (req, res) => {
    const blogId = req.params.id;
    const query = "UPDATE blog SET deleted = 1 WHERE blog_id = ?";
    handleRequest(req, res, query, [blogId],false);
});

// 阅读博客
router.put("/read/:id", async (req, res) => {
    const blogId = req.params.id;
    const query = "UPDATE blog SET view_count = view_count + 1  WHERE blog_id = ?";
    handleRequest(req, res, query, [blogId],false);
});


module.exports = router;
