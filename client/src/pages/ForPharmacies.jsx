import { Link } from "react-router-dom";

export default function ForPharmacies() {
  return (
    <>
      <section className="page-head">
        <div className="page-head-in">
          <h1>Let people nearby find what you have in stock</h1>
          <p>List your medicines once, keep quantities up to date, and show up when someone searches.</p>
          <div className="site-actions">
            <Link className="site-btn light" to="/register?type=pharmacy">Register your pharmacy</Link>
            <Link className="site-btn line" to="/login">Log in</Link>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="sec-in">
          <h2>What you can do</h2>
          <p className="sec-lead">Simple tools for running your listing.</p>
          <div className="feat">
            <div><b>Manage your stock</b><p>Add medicines with price and quantity, and edit them whenever they change.</p></div>
            <div><b>Get verified</b><p>An admin checks your license before your pharmacy goes live, so users can trust the listing.</p></div>
            <div><b>Show your hours</b><p>Your opening and closing times appear next to your stock, including late-night hours.</p></div>
            <div><b>Reservations</b><p>Hold medicine for people who are on their way, and handle deliveries.</p><span className="soon">Coming soon</span></div>
            <div><b>Urgent requests</b><p>Reply when someone nearby asks for a medicine you carry.</p><span className="soon">Coming soon</span></div>
          </div>
        </div>
      </section>

      <section className="sec pale">
        <div className="sec-in">
          <h2>Getting your pharmacy live</h2>
          <p className="sec-lead">Three steps from sign-up to your first search result.</p>
          <ol className="steps">
            <li><span>1</span><div><b>Register</b><p>Enter your pharmacy name, license number, address, city and opening hours.</p></div></li>
            <li><span>2</span><div><b>Wait for approval</b><p>The admin reviews your license. You can check the status on your dashboard.</p></div></li>
            <li><span>3</span><div><b>Add your stock</b><p>Once approved, add your medicines and they appear in search.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="cta">
        <h2>Put your pharmacy on MedFinder</h2>
        <p>Registration is free. Have your license number ready.</p>
        <div className="site-actions">
          <Link className="site-btn light" to="/register?type=pharmacy">Register your pharmacy</Link>
        </div>
      </section>
    </>
  );
}
