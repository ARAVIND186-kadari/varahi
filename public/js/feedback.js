// Varahi Tiffins - Customer Feedback & Review System

const Feedback = {
  selectedRating: 5,

  init() {
    this.bindEvents();
    this.loadPublicReviews();
  },

  bindEvents() {
    // Open feedback modal triggers
    const openBtns = document.querySelectorAll('.js-open-feedback');
    openBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal();
      });
    });

    // Close feedback modal triggers
    const closeBtns = document.querySelectorAll('.js-close-feedback');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModal();
      });
    });

    // Star rating picker interaction
    const starSelector = document.getElementById('starRatingSelector');
    if (starSelector) {
      const stars = starSelector.querySelectorAll('span');
      stars.forEach(star => {
        star.addEventListener('mouseover', (e) => {
          const val = parseInt(e.currentTarget.dataset.val, 10);
          this.highlightStars(val);
        });

        star.addEventListener('mouseout', () => {
          this.highlightStars(this.selectedRating);
        });

        star.addEventListener('click', (e) => {
          this.selectedRating = parseInt(e.currentTarget.dataset.val, 10);
          this.highlightStars(this.selectedRating);
          const ratingInput = document.getElementById('feedbackRatingInput');
          if (ratingInput) ratingInput.value = this.selectedRating;
        });
      });
    }

    // Feedback submission form
    const feedbackForm = document.getElementById('customerFeedbackForm');
    if (feedbackForm) {
      feedbackForm.addEventListener('submit', (e) => this.handleSubmit(e));
    }
  },

  highlightStars(val) {
    const starSelector = document.getElementById('starRatingSelector');
    if (!starSelector) return;
    const stars = starSelector.querySelectorAll('span');
    stars.forEach(s => {
      const starVal = parseInt(s.dataset.val, 10);
      if (starVal <= val) {
        s.classList.add('selected');
      } else {
        s.classList.remove('selected');
      }
    });

    const starDesc = document.getElementById('starRatingLabel');
    const descriptions = {
      1: "1 Star - Needs Major Improvement",
      2: "2 Stars - Below Average",
      3: "3 Stars - Average / Decent",
      4: "4 Stars - Very Good & Tasty",
      5: "5 Stars - Outstanding & Authentic!"
    };
    if (starDesc) {
      starDesc.textContent = descriptions[val] || `${val} Stars`;
    }
  },

  openModal() {
    const modal = document.getElementById('feedbackModalOverlay');
    if (modal) {
      modal.classList.add('active');
      this.highlightStars(this.selectedRating);
    }
  },

  closeModal() {
    const modal = document.getElementById('feedbackModalOverlay');
    if (modal) {
      modal.classList.remove('active');
    }
  },

  async handleSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('feedbackName').value.trim();
    const email = document.getElementById('feedbackEmail').value.trim();
    const category = document.getElementById('feedbackCategory').value;
    const reviewText = document.getElementById('feedbackText').value.trim();
    const suggestions = document.getElementById('feedbackSuggestions').value.trim();
    const orderRef = document.getElementById('feedbackOrderRef').value.trim();
    const honeypot = document.getElementById('feedbackWebsiteUrl') ? document.getElementById('feedbackWebsiteUrl').value : '';

    // Frontend validations
    if (name.length < 2) {
      showToast('Please enter your name (minimum 2 characters)', 'error');
      return;
    }
    if (!category) {
      showToast('Please select a feedback category', 'error');
      return;
    }
    if (reviewText.length < 10) {
      showToast('Please enter at least 10 characters for your review', 'error');
      return;
    }

    const submitBtn = document.getElementById('btnSubmitFeedback');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          customerEmail: email || null,
          rating: this.selectedRating,
          category,
          reviewText,
          suggestions: suggestions || null,
          orderRef: orderRef || null,
          honeypot
        })
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Failed to submit review', 'error');
        return;
      }

      this.closeModal();
      document.getElementById('customerFeedbackForm').reset();
      this.selectedRating = 5;
      this.highlightStars(5);

      showFeedbackConfirmationSuccess(data.feedbackId, data.isOrderVerified);
    } catch (err) {
      console.error('Feedback submit error:', err);
      showToast('A network error occurred. Please try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Feedback';
      }
    }
  },

  async loadPublicReviews() {
    try {
      const response = await fetch('/api/feedback/public');
      const data = await response.json();

      this.renderScorecard(data.stats);
      this.renderReviewsList(data.reviews);
    } catch (err) {
      console.warn('Failed to load public reviews:', err);
    }
  },

  renderScorecard(stats) {
    const avgScoreEl = document.getElementById('publicAvgScore');
    const totalReviewsEl = document.getElementById('publicTotalReviews');
    const starContainer = document.getElementById('publicScoreStars');
    const distributionContainer = document.getElementById('publicRatingDistribution');

    if (!stats || stats.totalReviews === 0) {
      if (avgScoreEl) avgScoreEl.textContent = '0.0';
      if (totalReviewsEl) totalReviewsEl.textContent = 'Based on 0 verified reviews';
      if (starContainer) starContainer.textContent = '☆☆☆☆☆';
      if (distributionContainer) {
        distributionContainer.innerHTML = `
          <div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 12px 0;">
            No approved customer reviews yet.
          </div>
        `;
      }
      return;
    }

    if (avgScoreEl) avgScoreEl.textContent = stats.averageRating.toFixed(1);
    if (totalReviewsEl) {
      totalReviewsEl.textContent = `Based on ${stats.totalReviews} approved review${stats.totalReviews > 1 ? 's' : ''}`;
    }

    if (starContainer) {
      const fullStars = Math.round(stats.averageRating);
      starContainer.textContent = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
    }

    if (distributionContainer && stats.ratingDistribution) {
      const total = stats.totalReviews;
      let html = '';
      for (let star = 5; star >= 1; star--) {
        const count = stats.ratingDistribution[star] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        html += `
          <div class="rating-bar-row">
            <span class="star-label">${star} ★</span>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${pct}%"></div>
            </div>
            <span class="bar-count">${count}</span>
          </div>
        `;
      }
      distributionContainer.innerHTML = html;
    }
  },

  renderReviewsList(reviews) {
    const container = document.getElementById('publicReviewsList');
    if (!container) return;

    if (!reviews || reviews.length === 0) {
      container.innerHTML = `
        <div class="empty-reviews-state" style="grid-column: 1 / -1;">
          <div style="font-size: 3rem; margin-bottom: 8px;">🌟</div>
          <h4 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700; margin-bottom: 6px;">
            Be the First to Review Varahi Tiffins!
          </h4>
          <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 480px; margin: 0 auto 16px;">
            We prepare every dosa, idli, and filter coffee with passion and pure ingredients. Share your dining or delivery experience with our Hyderabad community!
          </p>
          <button class="btn-open-feedback js-open-feedback" onclick="Feedback.openModal()">
            ✍️ Share Your Feedback
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = reviews.map(rev => {
      const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);
      const dateStr = new Date(rev.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      return `
        <div class="review-card">
          <div class="review-card-top">
            <div class="review-author">
              ${escapeHtml(rev.customerName)}
              ${rev.isOrderVerified ? '<span class="verified-badge">✓ Verified Customer</span>' : ''}
            </div>
            <div class="review-stars">${stars}</div>
          </div>
          <div class="review-category-badge">${escapeHtml(rev.category)}</div>
          <div class="review-text">${escapeHtml(rev.reviewText)}</div>
          ${rev.suggestions ? `
            <div style="font-size: 0.82rem; color: #92400E; background: #FEF3C7; padding: 6px 10px; border-radius: 6px;">
              💡 <strong>Suggestion:</strong> ${escapeHtml(rev.suggestions)}
            </div>
          ` : ''}
          <div class="review-date">${dateStr}</div>
          ${rev.adminResponse ? `
            <div class="admin-response-box">
              <div class="admin-response-title">
                <span>🛡️</span> Response from Varahi Tiffins Team
              </div>
              <div style="color: var(--text-secondary);">${escapeHtml(rev.adminResponse)}</div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }
};

function showFeedbackConfirmationSuccess(feedbackId, isOrderVerified) {
  const modalHtml = `
    <div class="modal-overlay active" id="feedbackSuccessModal">
      <div class="modal-dialog" style="max-width: 480px; text-align: center;">
        <div class="modal-header">
          <h3>Feedback Received!</h3>
          <button class="btn-close-drawer" onclick="document.getElementById('feedbackSuccessModal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div style="font-size: 3rem; margin-bottom: 12px; color: #10B981;">✓</div>
          <h4 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">
            Thank You for Your Valuable Review!
          </h4>
          <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px;">
            Your feedback (Ref: <strong>#${feedbackId}</strong>) has been securely saved. Our management reviews all feedback to maintain our quality standards.
            ${isOrderVerified ? '<br><span style="color: #059669; font-weight: 600;">Your order reference was verified!</span>' : ''}
          </p>
          <div style="background: #F1F5F9; border-radius: 8px; padding: 12px; font-size: 0.82rem; color: #475569; text-align: left; margin-bottom: 20px;">
            🔒 <strong>Privacy Notice:</strong> Your personal contact information is never displayed publicly. Only your review and chosen display name appear once approved by our moderation team.
          </div>
          <button class="btn-primary" style="width: 100%; padding: 12px;" onclick="document.getElementById('feedbackSuccessModal').remove()">
            Back to Website
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}
