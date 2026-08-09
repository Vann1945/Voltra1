USE voltramarketplace;

UPDATE users
SET role = 'admin'
WHERE email IN ('kanzakbarraihanriyanto86@gmail.com', 'unknownfeed76@gmail.com')
  AND role != 'admin';