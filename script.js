/* ===============================
   script.js (Frontend JavaScript)
   =============================== */

// เปลี่ยนค่า URL ให้เป็น URL ของ Web App ที่คุณได้จากขั้นตอน Deploy GAS
const API_BASE_URL = "https://script.google.com/macros/s/AKfycbxt8fK4QJgWIcJJcRues7_bSAvXz6WS-f3b4dHT9ByaAM18K5MsPxVZm24UGbOybTjv/exec";

document.addEventListener("DOMContentLoaded", function () {
  // อ้างอิง Element ต่าง ๆ
  const yearSelect       = document.getElementById("year-select");
  const dateInput        = document.getElementById("date-input");
  const loadBtn          = document.getElementById("load-students-btn");
  const studentsSection  = document.getElementById("students-section");
  const studentsListDiv  = document.getElementById("students-list");
  const attendanceForm   = document.getElementById("attendance-form");
  const messageDiv       = document.getElementById("message");

  let currentStudents = [];  // จะเก็บรายชื่อนักศึกษาที่ดึงมาจาก API

  /**
   * ฟังก์ชันโชว์ข้อความแจ้งเตือน
   * @param {string} text ข้อความที่จะแสดง
   * @param {boolean} isSuccess ถ้าเป็น true จะใช้สีเขียว, false จะใช้สีแดง
   */
  function showMessage(text, isSuccess = false) {
    messageDiv.textContent = text;
    if (isSuccess) {
      messageDiv.classList.remove("error");
      messageDiv.classList.add("success");
    } else {
      messageDiv.classList.remove("success");
      messageDiv.classList.add("error");
    }
    // ซ่อนข้อความอัตโนมัติหลัง 4 วินาที
    setTimeout(() => {
      messageDiv.textContent = "";
      messageDiv.classList.remove("success", "error");
    }, 4000);
  }

  /**
   * เมื่อคลิกปุ่ม “โหลดรายชื่อนักศึกษา”
   */
  loadBtn.addEventListener("click", function () {
    const year = yearSelect.value;
    const date = dateInput.value;

    // เช็คว่าเลือกชั้นปีหรือยัง
    if (!year) {
      showMessage("กรุณาเลือกชั้นปี", false);
      return;
    }
    // เช็คว่าเลือกวันที่หรือยัง
    if (!date) {
      showMessage("กรุณาเลือกวันที่", false);
      return;
    }

    // เรียก API GET: ?action=getStudents&year=…
    const url = `${API_BASE_URL}?action=getStudents&year=${encodeURIComponent(year)}`;

    fetch(url)
      .then(resp => resp.json())
      .then(data => {
        if (data.status === "ok") {
          currentStudents = data.students; // เก็บ array ชื่อที่ได้มา
          if (currentStudents.length === 0) {
            showMessage("ไม่มีรายชื่อนักศึกษาของชั้นปีนี้", false);
            studentsSection.classList.add("hidden");
            return;
          }
          // สร้างรายการ radio 3 ตัว (มา/ขาด/ลา) ให้แต่ละคน
          renderStudentRadios(currentStudents);
          // แสดงส่วน students-section
          studentsSection.classList.remove("hidden");
        } else {
          showMessage("เกิดข้อผิดพลาด: " + data.message, false);
          console.error(data);
        }
      })
      .catch(err => {
        showMessage("ไม่สามารถเชื่อมต่อ API ได้", false);
        console.error(err);
      });
  });

  /**
   * สร้าง radio 3 ตัว ให้แต่ละชื่อ (มา/ขาด/ลา)
   * @param {Array} students array of ชื่อ (string)
   */
  function renderStudentRadios(students) {
    // ล้างรายการเก่า (ถ้ามี)
    studentsListDiv.innerHTML = "";

    students.forEach(name => {
      // container แต่ละแถว
      const wrapper = document.createElement("div");
      wrapper.className = "student-item";

      // ส่วนแสดงชื่อ
      const nameDiv = document.createElement("div");
      nameDiv.className = "student-name";
      nameDiv.textContent = name;

      // ส่วนกลุ่ม radio (มา/ขาด/ลา)
      const statusDiv = document.createElement("div");
      statusDiv.className = "status-options";

      // สร้าง radio 3 ตัว
      ["มา", "ขาด", "ลา"].forEach(st => {
        const input = document.createElement("input");
        input.type  = "radio";
        input.name  = `status-${name}`;   // name เหมือนกันในแต่ละกลุ่มคน ให้เลือกได้ครั้งเดียว
        input.value = st;
        input.id    = `status-${name}-${st}`;

        // ตั้ง default เป็น “ขาด” (checked)
        if (st === "ขาด") {
          input.checked = true;
        }

        const label = document.createElement("label");
        label.htmlFor   = input.id;
        label.textContent = st;

        statusDiv.appendChild(input);
        statusDiv.appendChild(label);
      });

      // ต่อ element กัน: wrapper ← nameDiv + statusDiv
      wrapper.appendChild(nameDiv);
      wrapper.appendChild(statusDiv);

      // ต่อเข้าใน studentsListDiv
      studentsListDiv.appendChild(wrapper);
    });
  }

  /**
   * เมื่อ Submit ฟอร์มเช็คชื่อ
   */
  attendanceForm.addEventListener("submit", function (e) {
    e.preventDefault(); // ป้องกันไม่ให้ reload หน้า

    const year = yearSelect.value;
    const date = dateInput.value;

    if (!currentStudents || currentStudents.length === 0) {
      showMessage("ไม่พบรายชื่อนักศึกษา", false);
      return;
    }

    // สร้าง array of records: [ { name: "...", status: "มา" }, ... ]
    const records = currentStudents.map(name => {
      const selector = `input[name="status-${name}"]:checked`;
      const sel = attendanceForm.querySelector(selector);
      // ถ้าอย่างไรก็ให้ default เป็น “ขาด”
      const chosenStatus = sel ? sel.value : "ขาด";
      return {
        name: name,
        status: chosenStatus
      };
    });

    // สร้าง payload
    const payload = {
      year: year,
      date: date,
      records: records
    };

    // ส่ง POST ไปที่ GAS
    fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8"
      },
      body: JSON.stringify(payload)
    })
      .then(resp => resp.json())
      .then(data => {
        if (data.status === "ok") {
          showMessage("บันทึกเช็คชื่อเรียบร้อยแล้ว", true);
        } else {
          showMessage("เกิดข้อผิดพลาด: " + data.message, false);
          console.error(data);
        }
      })
      .catch(err => {
        showMessage("ไม่สามารถเชื่อมต่อ API ได้", false);
        console.error(err);
      });
  });
});
