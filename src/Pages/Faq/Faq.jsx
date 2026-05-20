import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LuChevronDown,
  LuCreditCard,
  LuHeartHandshake,
  LuMessageCircle,
  LuPackageCheck,
  LuRefreshCcw,
  LuShieldCheck,
  LuSparkles,
} from "react-icons/lu";
import "./faq.css";

const faqCategories = [
  {
    id: "shipping",
    label: "Shipping & Delivery",
    icon: LuPackageCheck,
    questions: [
      {
        question: "How long does shipping take?",
        answer: `Our standard production and dispatch time is 5 working days. In a hurry? You can opt to 'skip the queue' for a 50% surcharge, and we'll prioritize your design, printing, and painting to dispatch your mini within 48 hours!
Once your figurine is on its way, Standard Delivery takes 3-6 days (which is free for orders above ₹1000). For a speedier arrival, our Priority Delivery takes just 2-3 days.`
      },
      {
        question: "Do you ship internationally?",
        answer:
          "Yes! We ship worldwide. International orders typically take 7-14 business days depending on the destination. Please note that customs duties and taxes may apply for international shipments.",
      },
      {
        question: "How much does shipping cost?",
        answer:
          "Standard Delivery is Rs. 80 and Priority Delivery is Rs. 200. Orders over Rs. 1,000 qualify for free Standard Delivery.",
      },
      {
        question: "Can I track my order?",
        answer:
          "Yes! Once dispatched, you can find your tracking ID in the Orders tab of your profile. You can also check there anytime to track your order's production progress.",
      },
      {
        question: "What if my order is late?",
        answer:
          "We monitor all shipments closely. If your order is delayed beyond the estimated window, please contact us and we will investigate immediately. For custom orders, we will notify you if any production delays occur.",
      },
    ],
  },
  {
    id: "products",
    label: "Products & Quality",
    icon: LuSparkles,
    questions: [
      {
        question: "What materials are the figurines made of?",
        answer:
          "Our figurines are crafted from premium resin, which allows for incredible, crisp details and a beautiful hand-painted finish. They are carefully sculpted and designed to last for years with proper care.",
      },
      {
        question: "How big are the figurines?",
        answer:
          "Most of our standard figurines are 8-12cm cm tall. Larger collectible editions may vary and will have their dimensions listed on the product page.",
      },
      {
        question: "How does the custom minis process work?",
        answer:
          "Simply upload a clear photo of yourself or the person you'd like to turn into a custom chibi mini! I will create a digital preview and share it with you via WhatsApp for your approval. Once you love it, I'll get straight to work on the 3D modelling, printing, curing, painting, and final quality checks before shipping it your way.",
      },
      {
        question: "Can I request design revisions for custom orders?",
        answer:
          "Yes! Every custom order includes up to 2 rounds of free design revisions. We want to make sure your figurine looks exactly how you envisioned it.",
      },
      {
        question: "How should I care for my figurine?",
        answer:
          "Before shipping, I apply a UV-resistant clear coat to every mini, ensuring the paint remains vibrant and fade-resistant! To keep your figurine looking its best, please avoid using strong detergents or harsh soaps. A simple, gentle wipe with a smooth, wet cloth is all it takes to keep it clean",
      },
    ],
  },
  {
    id: "orders",
    label: "Orders & Payments",
    icon: LuCreditCard,
    questions: [
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept all major credit and debit cards, UPI, net banking, and popular digital wallets. All transactions are securely encrypted for your safety.",
      },
      {
        question: "Can I modify or cancel my order?",
        answer: `Since every mini is custom-crafted, the cancellation policy depends on how far along I am in the creation process:

Within 2 hours of ordering: Free cancellation with a 100% refund!

Modelling Phase: 20% cancellation fee.

Printing Phase: 70% cancellation fee (as materials and 3D printing time have been used).

Painting Phase: 100% cancellation fee (no refund, as your custom mini is fully brought to life).

If you need to make a change or cancel, please reach out to me as soon as possible!`,
      },
      {
        question: "What is The Puchi Armor Guarantee?",
        answer: `The Puchi Armor Guarantee (+₹100) is the ultimate protection for your mini! When you add this, I pack your order with extreme care using expanding foam, double boxes, and extra cushioning to ensure it survives even the roughest transit handling. 

If the unthinkable happens and it still arrives damaged, you are completely covered. All you have to do is provide a clear unboxing video, and I will craft and ship a free replacement to you at priority speed! The best part? You don't even have to deal with the hassle of returning the damaged figure.`
      },
      {
        question: "Will I receive an order confirmation?",
        answer:
          "Yes, you will receive an email confirmation immediately after placing your order. You can also view all your orders and their live status in the 'My Orders' section of your Profile.",
      },
      {
        question: "Do you offer gift wrapping?",
        answer:
          "Yes! We offer premium gift wrapping with a cute kawaii theme. You can select this option at checkout. Each wrapped order includes a handwritten note card if you leave a message.",
      },
    ],
  },
  {
    id: "returns",
    label: "Returns & Exchanges",
    icon: LuRefreshCcw,
    questions: [
      {
        question: "What is your return policy?",
        answer:
          "I accept returns within 3 days of delivery for unused, non-custom items in their original packaging. Since custom minis are made uniquely for you, they are non-returnable! If you do need to send an eligible item back, please ensure it is packed very securely—I cannot issue a refund if the figurine gets damaged in transit on its way back to me",
      },
      {
        question: "How do I initiate a return?",
        answer: `To report a mini damaged in transit, simply reach out to me via WhatsApp (just click the 'Contact Us' button at the bottom of this page!). 

* **With the Puchi Armor Guarantee:** Just send me your unboxing video! I will send you a free replacement even for minor damage and you don't even need to return the original figure.
* **Without the Guarantee:** Send me your unboxing video on WhatsApp, and I will provide you with my return address. Please pack the figure carefully! If it sustains further damage during the return trip, your refund may be reduced or denied.`
      },
      {
        question: "What if my figurine arrives damaged?",
       answer: `If your mini takes a bump during its journey, don't worry! Please contact me via WhatsApp within 24 hours of delivery and share your unboxing video. 

If you added the Puchi Armor Guarantee, I'll get a free replacement started for you right away (no need to mail the broken one back!). If you didn't select the guarantee, I will review your video and provide a return address so we can begin the standard return or replacement process.`
      },
      {
        question: "Can I exchange for a different figurine?",
        answer:
          "Since every single mini is uniquely crafted, 3D printed, and painted specifically for you, I do not offer exchanges for different models. If you have any concerns about the figurine you received, please drop me a message on WhatsApp!",
      },
      {
        question: "Who pays for return shipping?",
        answer:
          "Without the Puchi Armor Guarantee, you will be responsible for covering any return shipping fees",
      },
    ],
  },
];

function Faq() {
  const location = useLocation();
  const [activeCategoryId, setActiveCategoryId] = useState(faqCategories[0].id);
  const activeCategory = faqCategories.find((category) => category.id === activeCategoryId) ?? faqCategories[0];

  useEffect(() => {
    const categoryId = location.hash.replace("#", "");
    const targetCategory = faqCategories.find((category) => category.id === categoryId);

    if (!targetCategory) return;

    setActiveCategoryId(targetCategory.id);

    window.setTimeout(() => {
      document.getElementById(`faq-panel-${targetCategory.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }, [location.hash]);

  return (
    <main className="faq-page">
      <section className="faq-hero" aria-labelledby="faq-heading">
        <small className="tag faq-eyebrow">
          <LuHeartHandshake /> We are here to help
        </small>
        <h1 id="faq-heading" className="bold-800">Frequently Asked Questions</h1>
        <p>
          Everything you need to know about Puchi Puchi figurines, custom orders,
          shipping, and more.
        </p>
      </section>

      <section className="faq-content" aria-label="FAQ categories">
        <div className="faq-tabs" role="tablist" aria-label="FAQ categories">
          {faqCategories.map((category) => {
            const Icon = category.icon;
            const isActive = category.id === activeCategory.id;

            return (
              <button
                key={category.id}
                id={`faq-tab-${category.id}`}
                className={`faq-tab ${isActive ? "active" : ""}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`faq-panel-${category.id}`}
                onClick={() => setActiveCategoryId(category.id)}
              >
                <Icon />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>

        <div
          id={`faq-panel-${activeCategory.id}`}
          className="faq-panel"
          role="tabpanel"
          aria-labelledby={`faq-tab-${activeCategory.id}`}
        >
          <div className="faq-section-heading">
            <h2 className="bold-800">{activeCategory.label}</h2>
            <p>{activeCategory.questions.length} helpful answers</p>
          </div>

          <div className="faq-list">
            {activeCategory.questions.map((item, index) => (
              <details className="faq-item" key={item.question} open={index === 0}>
                <summary>
                  <span>{item.question}</span>
                  <LuChevronDown />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="faq-contact-card">
          <div className="faq-contact-icon">
            <LuMessageCircle />
          </div>
          <div>
            <h3 className="bold-800">Still have questions?</h3>
            <p>
              Our friendly support team is always happy to help. Reach out and we
              will get back to you within 24 hours.
            </p>
          </div>
          <a
            className="faq-contact-btn"
            href="https://wa.me/917907969115"
            target="_blank"
            rel="noreferrer"
          >
            Contact Us
          </a>
        </div>

        <div className="faq-guarantee-note">
          <LuShieldCheck />
          <span>
            100% replacement guarantee for transit damage.{" "}
            <Link to="/faq#returns">T&Cs apply.</Link>
          </span>
        </div>
      </section>
    </main>
  );
}

export default Faq;
