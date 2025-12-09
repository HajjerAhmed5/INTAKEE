/* Top banner */
.profile-banner {
    width: 100%;
    height: 180px;
    background: #111;
    border-radius: 14px;
    margin-bottom: 20px;
}

/* Profile card */
.profile-card {
    background: #0d0d0d;
    padding: 20px;
    border-radius: 14px;
    margin-bottom: 16px;
}

.profile-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.profile-avatar {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #222;
}

.profile-info {
    flex-grow: 1;
    margin-left: 15px;
}

.profile-info h3 {
    font-size: 1.3rem;
    margin: 0;
}

.profile-bio {
    margin-top: 6px;
    font-size: 0.9rem;
    color: #aaa;
}

.stat-row {
    display: flex;
    gap: 14px;
    margin-top: 10px;
    font-size: 0.9rem;
}

.profile-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.small-btn {
    padding: 6px 12px;
    font-size: 0.8rem;
    border-radius: 10px;
}

/* Tabs */
.profile-tabs-container {
    display: flex;
    gap: 10px;
    background: #0d0d0d;
    padding: 16px;
    border-radius: 14px;
    justify-content: center;
    margin-bottom: 14px;
}

.profile-tab {
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 0.85rem;
    border: 1px solid #555;
    background: #000;
    color: #fff;
    cursor: pointer;
}

.profile-tab.active {
    background: #fff;
    color: #000;
}

/* Grid */
.feed-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
    padding-bottom: 100px;
}
