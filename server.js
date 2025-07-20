const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// تهيئة قاعدة البيانات
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to SQLite database.');
});

// إنشاء الجداول
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      grade TEXT NOT NULL,
      subjects TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacherName TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      subject TEXT NOT NULL,
      level TEXT NOT NULL,
      date TEXT NOT NULL,
      views INTEGER DEFAULT 0,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      youtubeLink TEXT NOT NULL
    )
  `);
});

// نقطة النهاية لتسجيل دخول المدرس
app.post('/api/teacher/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'teacher' && password === 'T1234@2025') {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة!' });
  }
});

// نقطة النهاية لتسجيل دخول الطالب
app.post('/api/student/login', (req, res) => {
  const { code } = req.body;
  
  db.get('SELECT * FROM students WHERE code = ?', [code], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
    }
    
    if (row) {
      res.json({ 
        success: true,
        student: {
          ...row,
          subjects: JSON.parse(row.subjects)
        }
      });
    } else {
      res.status(401).json({ error: 'الكود الذي أدخلته غير صحيح' });
    }
  });
});

// نقطة النهاية للحصول على الطلاب
app.get('/api/students', (req, res) => {
  db.all('SELECT * FROM students', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
    }
    
    const students = rows.map(student => ({
      ...student,
      subjects: JSON.parse(student.subjects)
    }));
    
    res.json(students);
  });
});

// نقطة النهاية لإضافة طالب جديد
app.post('/api/students', (req, res) => {
  const { name, phone, email, grade, subjects, code, date } = req.body;
  
  db.run(
    `INSERT INTO students (name, phone, email, grade, subjects, code, date) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, phone, email, grade, JSON.stringify(subjects), code, date],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطأ في إضافة الطالب' });
      }
      
      res.json({ 
        success: true,
        id: this.lastID,
        code
      });
    }
  );
});

// نقطة النهاية لتحديث الطالب
app.put('/api/students/:id', (req, res) => {
  const id = req.params.id;
  const { name, phone, email, grade, subjects } = req.body;
  
  db.run(
    `UPDATE students SET 
      name = ?, 
      phone = ?, 
      email = ?, 
      grade = ?, 
      subjects = ? 
     WHERE id = ?`,
    [name, phone, email, grade, JSON.stringify(subjects), id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطأ في تحديث الطالب' });
      }
      
      res.json({ 
        success: true,
        changes: this.changes
      });
    }
  );
});

// نقطة النهاية لحذف الطالب
app.delete('/api/students/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM students WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطأ في حذف الطالب' });
    }
    
    res.json({ 
      success: true,
      changes: this.changes
    });
  });
});

// نقطة النهاية للحصول على الفيديوهات
app.get('/api/videos', (req, res) => {
  const category = req.query.category;
  
  let query = 'SELECT * FROM videos';
  const params = [];
  
  if (category) {
    query += ' WHERE category = ?';
    params.push(category);
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
    }
    
    res.json(rows);
  });
});

// نقطة النهاية لإضافة فيديو جديد
app.post('/api/videos', (req, res) => {
  const { teacherName, title, description, subject, level, date, type, category, youtubeLink } = req.body;
  
  db.run(
    `INSERT INTO videos (teacherName, title, description, subject, level, date, views, type, category, youtubeLink) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [teacherName, title, description, subject, level, date, 0, type, category, youtubeLink],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطأ في إضافة الفيديو' });
      }
      
      res.json({ 
        success: true,
        id: this.lastID
      });
    }
  );
});

// نقطة النهاية لتحديث الفيديو
app.put('/api/videos/:id', (req, res) => {
  const id = req.params.id;
  const { teacherName, title, description, subject, level, category, youtubeLink } = req.body;
  
  db.run(
    `UPDATE videos SET 
      teacherName = ?, 
      title = ?, 
      description = ?, 
      subject = ?, 
      level = ?, 
      category = ?, 
      youtubeLink = ? 
     WHERE id = ?`,
    [teacherName, title, description, subject, level, category, youtubeLink, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'خطأ في تحديث الفيديو' });
      }
      
      res.json({ 
        success: true,
        changes: this.changes
      });
    }
  );
});

// نقطة النهاية لحذف الفيديو
app.delete('/api/videos/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM videos WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'خطأ في حذف الفيديو' });
    }
    
    res.json({ 
      success: true,
      changes: this.changes
    });
  });
});

// نقطة النهاية للحصول على مدرسي صف الطالب
app.get('/api/teachers', (req, res) => {
  const teachers = [
    { name: "أ. محمد أحمد", subject: "الرياضيات", description: "مدرس رياضيات متميز بخبرة 10 سنوات" },
    { name: "أ. سارة علي", subject: "الفيزياء", description: "مدرسة فيزياء حاصلة على جوائز علمية" },
    { name: "أ. خالد محمود", subject: "الكيمياء", description: "مدرس كيمياء محترف في منهجية التدريس" }
  ];
  
  res.json(teachers);
});

// نقطة النهاية للحصول على فيديوهات مدرس معين
app.get('/api/videos/teacher/:name', (req, res) => {
  const teacherName = req.params.name;
  
  db.all('SELECT * FROM videos WHERE teacherName = ?', [teacherName], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'خطأ في قاعدة البيانات' });
    }
    
    res.json(rows);
  });
});

// نقطة النهاية الرئيسية لتقديم ملفات التطبيق
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// تشغيل الخادم
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
})
