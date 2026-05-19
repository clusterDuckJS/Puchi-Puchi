import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LuHeart, LuSend, LuStar } from "react-icons/lu";
import { supabase } from "../../utils/supabase";
import { isTimeoutError, withRequestTimeout } from "../../utils/request";
import "./reviews.css";

const createBlankReviewForm = () => ({
  reviewer_first_name: "",
  place: "",
  product_name: "",
  rating: "5",
  review_text: "",
});

const formatReviewDate = (value) => {
  if (!value) return "";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const StarRating = ({ rating }) => (
  <div className="review-stars" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <LuStar className={star <= rating ? "filled" : ""} key={star} />
    ))}
  </div>
);

function Reviews() {
  const location = useLocation();
  const isReviewFormRoute = location.pathname === "/reviews/new";
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState(createBlankReviewForm);
  const [formStatus, setFormStatus] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const fetchReviews = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const { data, error } = await withRequestTimeout(supabase
          .from("reviews")
          .select("*")
          .eq("is_approved", true)
          .order("review_date", { ascending: false })
          .order("created_at", { ascending: false }));

        if (!isCurrent) return;

        if (error) throw error;

        setReviews(data || []);
      } catch (error) {
        if (!isCurrent) return;

        console.error("Reviews load error:", error);
        setErrorMessage(
          isTimeoutError(error)
            ? "Reviews are taking too long to load. Please refresh in a moment."
            : "We could not load reviews right now."
        );
        setReviews([]);
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    fetchReviews();

    return () => {
      isCurrent = false;
    };
  }, []);

  const stats = useMemo(() => {
    const count = reviews.length;
    const average = count
      ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / count
      : 0;
    const distribution = [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: reviews.filter((review) => review.rating === rating).length,
    }));

    return {
      count,
      average,
      distribution,
    };
  }, [reviews]);

  const featuredReview = reviews.find((review) => review.rating === 5) || reviews[0];

  const handleFormChange = (field, value) => {
    setFormStatus("");
    setFormError("");
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();
    setFormStatus("");
    setFormError("");

    const payload = {
      reviewer_first_name: form.reviewer_first_name.trim(),
      place: form.place.trim(),
      product_name: form.product_name.trim(),
      rating: Number(form.rating),
      review_text: form.review_text.trim(),
      is_approved: false,
      source: "customer",
    };

    if (!payload.reviewer_first_name || !payload.place || !payload.product_name || !payload.review_text) {
      setFormError("Please fill every field before submitting your review.");
      return;
    }

    if (payload.rating < 1 || payload.rating > 5) {
      setFormError("Please choose a rating between 1 and 5.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await withRequestTimeout(supabase
        .from("reviews")
        .insert(payload));

      if (error) throw error;

      setForm(createBlankReviewForm());
      setFormStatus("Thank you. Your review has been submitted and will appear after approval.");
    } catch (error) {
      console.error("Review submit error:", error);
      setFormError("We could not submit your review right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="reviews-page">
      <section className="reviews-hero">
        <small className="tag color-primary bold-700">Fan Notes</small>
        <h1 className="bold-800 center">What Our Customers Say</h1>
        <p className="center">
          Real reviews from Puchi Puchi customers, with the product they picked and where their tiny keepsake found a home.
        </p>
        {!isReviewFormRoute && (
          <NavLink className="reviews-share-link" to="/reviews/new">
            Share Your Review
          </NavLink>
        )}
      </section>

      {isReviewFormRoute ? (
        <section className="review-form-section" aria-label="Submit a review">
          <form className="review-form-card" onSubmit={handleSubmitReview}>
            <div className="review-form-heading">
              <LuHeart />
              <div>
                <h2>Leave a Review</h2>
                <p>This is the link you can send customers after their order arrives.</p>
              </div>
            </div>

            <div className="review-form-grid">
              <label>
                First name
                <input
                  type="text"
                  value={form.reviewer_first_name}
                  onChange={(event) => handleFormChange("reviewer_first_name", event.target.value.slice(0, 40))}
                  placeholder="Aarav"
                  maxLength={40}
                  required
                />
              </label>
              <label>
                Place
                <input
                  type="text"
                  value={form.place}
                  onChange={(event) => handleFormChange("place", event.target.value.slice(0, 80))}
                  placeholder="Bengaluru"
                  maxLength={80}
                  required
                />
              </label>
              <label className="review-form-wide">
                Product name
                <input
                  type="text"
                  value={form.product_name}
                  onChange={(event) => handleFormChange("product_name", event.target.value.slice(0, 120))}
                  placeholder="Personalized Funko Pop"
                  maxLength={120}
                  required
                />
              </label>
              <label>
                Rating
                <select
                  value={form.rating}
                  onChange={(event) => handleFormChange("rating", event.target.value)}
                >
                  <option value="5">5 stars</option>
                  <option value="4">4 stars</option>
                  <option value="3">3 stars</option>
                  <option value="2">2 stars</option>
                  <option value="1">1 star</option>
                </select>
              </label>
              <label className="review-form-wide">
                Review
                <textarea
                  value={form.review_text}
                  onChange={(event) => handleFormChange("review_text", event.target.value.slice(0, 1000))}
                  placeholder="Tell us what you loved..."
                  rows={6}
                  maxLength={1000}
                  required
                />
                <small>{form.review_text.length}/1000 characters</small>
              </label>
            </div>

            {formError && <p className="review-form-message error">{formError}</p>}
            {formStatus && <p className="review-form-message">{formStatus}</p>}

            <button className="primary review-submit-button" type="submit" disabled={isSubmitting}>
              <LuSend /> {isSubmitting ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="review-summary-section">
            <div className="review-summary-card">
              <div className="review-average">
                <strong>{stats.count ? stats.average.toFixed(1) : "0.0"}</strong>
                <StarRating rating={Math.round(stats.average)} />
                <span>{stats.count} review{stats.count === 1 ? "" : "s"}</span>
              </div>

              <div className="review-bars">
                {stats.distribution.map((row) => (
                  <div className="review-bar-row" key={row.rating}>
                    <span>{row.rating} star</span>
                    <div>
                      <em style={{ width: `${stats.count ? (row.count / stats.count) * 100 : 0}%` }} />
                    </div>
                    <strong>{row.count}</strong>
                  </div>
                ))}
              </div>
            </div>

            {featuredReview && (
              <blockquote className="review-featured-quote">
                <p>"{featuredReview.review_text}"</p>
                <cite>
                  {featuredReview.reviewer_first_name} from {featuredReview.place}, reviewing {featuredReview.product_name}
                </cite>
              </blockquote>
            )}
          </section>

          <section className="reviews-list-section" aria-label="Customer reviews">
            {loading && (
              <div className="reviews-grid">
                {[1, 2, 3, 4].map((item) => (
                  <div className="review-skeleton" key={item} />
                ))}
              </div>
            )}

            {!loading && errorMessage && (
              <p className="reviews-status">{errorMessage}</p>
            )}

            {!loading && !errorMessage && reviews.length === 0 && (
              <div className="reviews-empty">
                <LuStar />
                <h2>No reviews yet</h2>
                <p>Customer reviews will appear here after they are approved.</p>
              </div>
            )}

            {!loading && !errorMessage && reviews.length > 0 && (
              <div className="reviews-grid">
                {reviews.map((review) => (
                  <article className="review-card" key={review.id}>
                    <div className="review-card-top">
                      <div className="review-avatar" aria-hidden="true">
                        {review.reviewer_first_name?.charAt(0) || "P"}
                      </div>
                      <div>
                        <h3>{review.reviewer_first_name}</h3>
                        <p>{review.place}</p>
                      </div>
                      <span>{formatReviewDate(review.review_date)}</span>
                    </div>

                    <StarRating rating={review.rating} />
                    <strong>{review.product_name}</strong>
                    <p>{review.review_text}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default Reviews;
