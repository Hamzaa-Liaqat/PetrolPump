# Haath se jaanch (har release se pehle)

Teen users banayein (owner / manager / cashier) aur har ek se ye dekhein.

## Login aur ijazat
- [ ] Ghalat password: saaf paigham; 5 baar ghalat: 15 minute ka lock
- [ ] Page refresh (F5) par login bacha rahe
- [ ] Cashier ko sirf Billing; manager ko Users nahi; owner ko sab
- [ ] Address bar mein `/users` (manager/cashier se): "ijazat nahi"

## Poora chakkar
1. [ ] Fuel rates: teeno fuel ka rate lagayein
2. [ ] Tanks: tank banayein, Dip check se opening stock, phir Nozzles mein nozzle
3. [ ] Deliveries: delivery darj karein, tank ka stock barhe; wohi invoice dobara: ghalti
4. [ ] Billing: sale darj karein, receipt aaye, tank ka stock ghate
5. [ ] Void: sab se nayi sale void karein, stock aur meter wapas
6. [ ] Credit: customer, limit (owner), udhaar, payment, statement, reverse
7. [ ] Staff: attendance, mahina khatam hone par payslip
8. [ ] Expenses: kharcha, void
9. [ ] Dashboard, Reports: teeno jagah sales ek jaisi; PDF aur Excel download

## Mushkil haalat
- [ ] Backend band: "Server offline", koi page crash nahi
- [ ] Do cashier ek hi nozzle par ek saath sale: sirf ek kamyab
- [ ] Mobile (360 width) par Billing, Deliveries aur Navbar

## Aakhir mein
- [ ] `.\run-all-tests.ps1` poora hara
- [ ] `git status` mein `.env`, `venv`, `node_modules` nazar nahi aate