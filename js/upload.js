<!-- ⭐ UPLOAD TAB (CLEAN VERSION) -->
<section id="upload" class="tab-section" style="display:none;">

    <h2 class="muted" style="margin-bottom:20px;">Upload Content</h2>

    <div class="upload-container">

        <!-- Content Category -->
        <label class="form-label">Content Category</label>
        <select id="uploadTypeSelect" class="form-input">
            <option value="video">Video</option>
            <option value="clip">Clip</option>
            <option value="podcast-audio">Podcast — Audio Only</option>
            <option value="podcast-video">Podcast — Video</option>
        </select>

        <!-- Title -->
        <label class="form-label">Title</label>
        <input id="uploadTitleInput" class="form-input" placeholder="Give your post a title" maxlength="70" />

        <!-- Description -->
        <label class="form-label">Description (Optional)</label>
        <textarea id="uploadDescInput" class="form-input" maxlength="2000" placeholder="Describe your content..."></textarea>

        <!-- Thumbnail -->
        <label class="form-label">Thumbnail Image (Only required for audio podcasts)</label>
        <input id="uploadThumbInput" type="file" class="form-input" accept="image/*" />

        <!-- File Upload -->
        <label class="form-label">Main Content File</label>
        <input id="uploadFileInput" type="file" class="form-input" accept="video/*,audio/*" />

        <!-- Age Restriction -->
        <div class="settings-toggle" style="margin: 20px 0;">
            <span>Is this restricted to 18+?</span>
            <label class="switch">
                <input type="checkbox" id="ageRestrictionToggle" />
                <span class="slider round"></span>
            </label>
        </div>

    </div>

    <!-- ⭐ UPLOAD + GO LIVE BUTTONS AT BOTTOM -->
    <div class="upload-bottom-actions" style="display:flex; gap:12px; margin-top:25px;">
        <button id="btnUpload" class="primary" style="flex:1;">Upload</button>
        <button id="btnGoLive" class="primary ghost" style="flex:1;">Go Live</button>
    </div>

</section>
