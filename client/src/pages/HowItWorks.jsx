import { Link } from "react-router-dom";

export default function HowItWorks() {
  return (
    <>
      <section className="page-head">
        <div className="page-head-in">
          <h1>How MedFinder works</h1>
          <p>Pharmacies share what they have in stock. Users search it. Here is what each side does.</p>
        </div>
      </section>

      <section className="sec">
        <div className="sec-in steps-2">
          <div>
            <h3>If you are looking for medicine</h3>
            <ol className="steps">
              <li><span>1</span><div><b>Create an account</b><p>Sign up as a user with your name and email.</p></div></li>
              <li><span>2</span><div><b>Search</b><p>Enter a brand or generic name. Filter by city or in-stock only.</p></div></li>
              <li><span>3</span><div><b>Compare</b><p>Open a medicine to see each pharmacy, its price, stock and hours.</p></div></li>
              <li><span>4</span><div><b>Go and collect</b><p>Visit a pharmacy that has it in stock and is open.</p></div></li>
            </ol>
          </div>
          <div>
            <h3>If you run a pharmacy</h3>
            <ol className="steps">
              <li><span>1</span><div><b>Register</b><p>Submit your details and license number.</p></div></li>
              <li><span>2</span><div><b>Get verified</b><p>The admin reviews your license and approves or rejects it.</p></div></li>
              <li><span>3</span><div><b>List your stock</b><p>Add medicines with price and quantity.</p></div></li>
              <li><span>4</span><div><b>Stay current</b><p>Update quantities so users see accurate stock.</p></div></li>
            </ol>
          </div>
        </div>
      </section>

      <section className="sec pale">
        <div className="sec-in">
          <h2>Why pharmacies are verified</h2>
          <p className="sec-lead">
            Every pharmacy is checked by an admin before it can appear in search, so you only see licensed pharmacies.
          </p>
          <div className="site-actions" style={{ justifyContent: "flex-start" }}>
            <Link className="site-btn solid" to="/register">Sign up as a user</Link>
            <Link className="site-btn ghost" to="/register?type=pharmacy">Register a pharmacy</Link>
          </div>
        </div>
      </section>
    </>
  );
}
