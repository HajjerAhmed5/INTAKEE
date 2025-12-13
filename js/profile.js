/* ===================================== */
/*          NEW PROFILE LAYOUT           */
/* ===================================== */

/* ---- 2x2 PROFILE GRID AT TOP ---- */
.profile-grid {
    width: 100%;
    max-width: 900px;
    margin: 0 auto 30px auto;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    aspect-ratio: 1 / 1;
    background: #111;
    border-radius: 12px;
}

/* ---- CENTER AVATAR ---- */
.profile-center-avatar {
    text-align: center;
    margin-top: -50px; /* Pull avatar into the grid */
    position: relative;
}

.profile-avatar {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    border: 4px solid #000;
    object-fit: cover;
}

.edit-profile-btn {
    margin-top: 14px;
    background: #fff !important;
    color: #000 !important;
    border-radius: 20px;
    padding: 6px 16px;
    font-weight: 600;
}

/* ---- CENTERED USER INFO ---- */
.profile-info-center {
    text-align: center;
    margin-top: 20px;
}

.profile-info-center h3 {
    font-size: 1.5rem;
    margin-bottom: 4px;
}

.profile-bio {
    color: #ccc;
    font-size: 0.9rem;
}

/* ---- CENTERED STATS ---- */
.profile-stats-center {
    display: flex;
    justify-content: center;
    gap: 45px;
    margin: 20px auto;
    text-align: center;
}

.profile-stats-center div span {
    display: block;
    font-size: 0.8rem;
    color: #aaa;
}

/* ---- PILLS ---- */
.profile-tabs-wrap-center {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
}

.profile-tabs-center {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
}

.pill {
    padding: 8px 14px;
    border: 1px solid #fff;
    background: #000;
    color: #fff;
    border-radius: 20px;
    cursor: pointer;
    transition: 0.2s;
}

.pill.active {
    background: #fff;
    color: #000;
}

/* ---- PROFILE GRID FEED ---- */
.feed-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
    padding-bottom: 100px;
}
