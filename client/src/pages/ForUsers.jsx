import { Link } from "react-router-dom";

export default function ForUsers() {
  return (
    <>
      <section className="page-head">
        <div className="page-head-in">
          <h1>Find medicine at pharmacies near you</h1>
          <p>Check stock and price from your phone, then go straight to a pharmacy that has what you need.</p>
          <div className="site-actions">
            <Link className="site-btn light" to="/register">Create a free account</Link>
            <Link className="site-btn line" to="/login">Log in</Link>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="sec-in">
          <h2>What you can do</h2>
          <p className="sec-lead">Everything a user needs to find medicine quickly.</p>
          <div className="feat">
            <div><b>Search by name</b><p>Type a brand like Panadol or a generic name like paracetamol. Results update as you type.</p></div>
            <div><b>See stock and price</b><p>Each result shows whether a pharmacy has it in stock, low on stock, or out, with the price.</p></div>
            <div><b>Find what is nearby</b><p>Share your location to see how far each pharmacy is, filter by distance and see them on a map.</p></div>
            <div><b>Filter your results</b><p>Pick your city, show only medicine in stock, or sort by lowest price.</p></div>
            <div><b>Check opening hours</b><p>See if a pharmacy is open now before you travel.</p></div>
            <div><b>Reserve for pickup</b><p>Choose how many and how long to hold it. A countdown shows how long you have left to collect.</p></div>
            <div><b>Urgent requests</b><p>Ask nearby pharmacies when you cannot find a medicine.</p><span className="soon">Coming soon</span></div>
          </div>
        </div>
      </section>

      <section className="cta">
        <h2>Search now</h2>
        <p>It takes a minute to sign up. Then you can search every verified pharmacy.</p>
        <div className="site-actions">
          <Link className="site-btn light" to="/register">Sign up as a user</Link>
        </div>
      </section>
    </>
  );
}
