/* ---------- SETTINGS TAB (ACCORDION BEHAVIOR) ---------- */
.settings-page {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-title {
  font-size: 24px;
  text-align: center;
  margin-bottom: 10px;
  font-weight: bold;
}

.settings-section {
  background: #111;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.3s;
}

.settings-section:hover {
  background: #1a1a1a;
}

.settings-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.settings-content {
  display: none;
  margin-top: 10px;
  font-size: 14px;
  color: #ccc;
  line-height: 1.6;
}

.settings-section.open .settings-content {
  display: block;
}

.settings-section h4 {
  margin-top: 10px;
  font-size: 16px;
  color: #fff;
}

.settings-section ul {
  padding-left: 20px;
  margin: 10px 0;
}

.settings-section button {
  display: inline-block;
  margin: 8px 8px 0 0;
  padding: 8px 12px;
  border: 1px solid #fff;
  border-radius: 5px;
  background: black;
  color: white;
  cursor: pointer;
}
